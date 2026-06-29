import {
  Duration,
  RemovalPolicy,
  aws_certificatemanager,
  aws_cloudwatch_actions,
  aws_ec2,
  aws_ecs,
  aws_elasticloadbalancingv2,
  aws_route53,
  aws_route53_targets,
  aws_sns,
  aws_ssm,
  aws_wafv2,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Vpc } from "./vpc";
import { ComparisonOperator, Stats } from "aws-cdk-lib/aws-cloudwatch";
import { HttpCodeElb } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { CODE_NAME } from "../constants";

type Props = {
  vpc: Vpc;
  hostedZone: aws_route53.IHostedZone;
  certificate: aws_certificatemanager.ICertificate;
  useNakedDomainAsDefault?: boolean;
  alarmTopic: aws_sns.ITopic;
  albSg: string[];
  albDomain: {
    Api: string;
    Web: "";
    WebWww: string;
  };
  enableWaf?: boolean;
};

export class Alb extends Construct {
  loadBalancer: aws_elasticloadbalancingv2.ApplicationLoadBalancer;
  httpsListener: aws_elasticloadbalancingv2.ApplicationListener;
  webDomain: string;
  webDomainWww: string;
  primaryWebDomain: string;
  apiDomain: string;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    this.webDomain = `${props.hostedZone.zoneName}`;
    this.webDomainWww = `www.${props.hostedZone.zoneName}`;
    this.primaryWebDomain = props.useNakedDomainAsDefault
      ? this.webDomain
      : this.webDomainWww;
    this.apiDomain = `api.${props.hostedZone.zoneName}`;

    const albSecurityGroup = new aws_ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: props.vpc.main,
      description: 'Allow HTTPS traffic to ALB',
      allowAllOutbound: false,
    });

    props.albSg.forEach((ipRange) => {
      albSecurityGroup.addIngressRule(
        aws_ec2.Peer.ipv4(ipRange),
        aws_ec2.Port.tcp(443),
        `Allow HTTP from ${ipRange}`
      );
    });

    this.loadBalancer = new aws_elasticloadbalancingv2.ApplicationLoadBalancer(
      this,
      "LoadBalancer",
      {
        vpc: props.vpc.main,
        internetFacing: true,
        securityGroup: albSecurityGroup,
      }
    );

    if (props.enableWaf) {
      const wafWebAclArn = aws_ssm.StringParameter.valueForStringParameter(
        this,
        `/${CODE_NAME}/waf/webacl-arn`
      );
      new aws_wafv2.CfnWebACLAssociation(this, "ALBWafAssociation", {
        resourceArn: this.loadBalancer.loadBalancerArn,
        webAclArn: wafWebAclArn,
      });
    }

    this.httpsListener = this.loadBalancer.addListener("HttpsListener", {
      protocol: aws_elasticloadbalancingv2.ApplicationProtocol.HTTPS,
      port: 443,
      certificates: [props.certificate],
      sslPolicy: "ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09" as aws_elasticloadbalancingv2.SslPolicy,
      open: false,
    });

    // props.useNakedDomainAsDefault
    //   false: example.com -> www.example.com
    //   true: www.example.com -> example.com
    this.httpsListener.addAction("PrimaryWebDomain", {
      action: aws_elasticloadbalancingv2.ListenerAction.redirect({
        port: "443",
        protocol: aws_elasticloadbalancingv2.ApplicationProtocol.HTTPS,
        permanent: true,
        host: props.useNakedDomainAsDefault
          ? this.webDomain
          : this.webDomainWww,
      }),
      priority: 2,
      conditions: [
        aws_elasticloadbalancingv2.ListenerCondition.hostHeaders([
          props.useNakedDomainAsDefault ? this.webDomainWww : this.webDomain,
        ]),
      ],
    });

    const domainsToProcess: [keyof typeof props.albDomain, string][] = [
      ["Api", this.apiDomain],
      ["Web", this.webDomain],
      ["WebWww", this.webDomainWww],
    ];
    domainsToProcess.forEach(([key, domain]) => {
      if (props.albDomain[key]) {
        new aws_route53.CnameRecord(this, `CnameRecord${key}`, {
          zone: props.hostedZone,
          recordName: domain,
          domainName: props.albDomain[key],
        }).applyRemovalPolicy(RemovalPolicy.DESTROY);
      } else {
        new aws_route53.ARecord(this, `ARecord${key}`, {
          zone: props.hostedZone,
          recordName: domain,
          target: aws_route53.RecordTarget.fromAlias(
            new aws_route53_targets.LoadBalancerTarget(this.loadBalancer)
          ),
        }).applyRemovalPolicy(RemovalPolicy.DESTROY);

        new aws_route53.AaaaRecord(this, `AaaaRecord${key}`, {
          zone: props.hostedZone,
          recordName: domain,
          target: aws_route53.RecordTarget.fromAlias(
            new aws_route53_targets.LoadBalancerTarget(this.loadBalancer)
          ),
        }).applyRemovalPolicy(RemovalPolicy.DESTROY);
      }
    });

    // Alarm for ALB - ResponseTime
    this.loadBalancer.metrics
      .targetResponseTime({
        period: Duration.minutes(1),
        statistic: Stats.AVERAGE,
      })
      .createAlarm(this, "AlbResponseTime", {
        evaluationPeriods: 3,
        threshold: 100,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        actionsEnabled: true,
      })
      .addAlarmAction(new aws_cloudwatch_actions.SnsAction(props.alarmTopic));

    // Alarm for ALB - HTTP 5XX Count
    this.loadBalancer.metrics
      .httpCodeElb(HttpCodeElb.ELB_5XX_COUNT, {
        period: Duration.minutes(1),
        statistic: Stats.SUM,
      })
      .createAlarm(this, "AlbHttp5xx", {
        evaluationPeriods: 3,
        threshold: 10,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        actionsEnabled: true,
      })
      .addAlarmAction(new aws_cloudwatch_actions.SnsAction(props.alarmTopic));
  }

  addEcsTarget(
    id: string,
    props: {
      ecsService: aws_ecs.FargateService;
      containerName: string;
      containerPort: number;
      healthPath?: string;
      hostHeader?: string;
    }
  ) {
    const tg = new aws_elasticloadbalancingv2.ApplicationTargetGroup(
      this,
      `${id}TargetGroup`,
      {
        vpc: this.loadBalancer.vpc,
        port: props.containerPort,
        protocol: aws_elasticloadbalancingv2.ApplicationProtocol.HTTP,
        healthCheck: {
          path: props.healthPath ?? "/health",
          port: String(props.containerPort),
          timeout: Duration.seconds(3),
          interval: Duration.seconds(5),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 2,
        },
        deregistrationDelay: Duration.seconds(5),
        targetType: aws_elasticloadbalancingv2.TargetType.IP,
        targets: [
          props.ecsService.loadBalancerTarget({
            containerName: props.containerName,
            containerPort: props.containerPort,
          }),
        ],
      }
    );
    this.httpsListener.addTargetGroups(
      `${id}TargetGroupRouting`,
      props.hostHeader
        ? {
            priority: 1,
            conditions: [
              aws_elasticloadbalancingv2.ListenerCondition.hostHeaders([
                props.hostHeader,
              ]),
            ],
            targetGroups: [tg],
          }
        : { targetGroups: [tg] }
    );
    return tg;
  }
}
