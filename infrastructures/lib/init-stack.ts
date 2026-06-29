import {
  Duration,
  PhysicalName,
  RemovalPolicy,
  Stack,
  StackProps,
  aws_chatbot,
  aws_iam,
  aws_logs,
  aws_route53,
  aws_sns,
  aws_ssm,
  aws_wafv2,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { AppEnv } from "./utils/env";
import { CODE_NAME } from "../constants";

export class InitStack extends Stack {
  hostedZone: aws_route53.IHostedZone;
  envHostedZones: Record<AppEnv, aws_route53.IHostedZone>;
  wafWebAcl: aws_wafv2.CfnWebACL;
  slackAlertTopic: aws_sns.ITopic;
  slackInfoTopic: aws_sns.ITopic;

  constructor(
    scope: Construct,
    id: string,
    props: StackProps & {
      notifySlack: {
        workspaceId: string;
        channelId: {
          info: string;
          alert: string;
        };
      };
    }
  ) {
    super(scope, id, props);

    this.hostedZone = new aws_route53.HostedZone(this, "HostedZone", {
      zoneName: "example.lineminiapps.com",
    });

    const sndHostedZone = new aws_route53.HostedZone(this, "SndHostedZone", {
      zoneName: "snd.example.lineminiapps.com",
    });

    const devHostedZone = new aws_route53.HostedZone(this, "DevHostedZone", {
      zoneName: "dev.example.lineminiapps.com",
    });

    const stgHostedZone = new aws_route53.HostedZone(this, "StgHostedZone", {
      zoneName: "stg.example.lineminiapps.com",
    });

    this.envHostedZones = {
      snd: sndHostedZone,
      dev: devHostedZone,
      stg: stgHostedZone,
      prd: this.hostedZone,
    };

    const delegates = [
      this.envHostedZones.snd,
      this.envHostedZones.dev,
      this.envHostedZones.stg,
    ];

    delegates.forEach((delegate) => {
      new aws_route53.NsRecord(this, delegate.zoneName, {
        zone: this.hostedZone,
        recordName: delegate.zoneName,
        values: delegate.hostedZoneNameServers ?? [],
        ttl: Duration.seconds(300),
      }).applyRemovalPolicy(RemovalPolicy.DESTROY);
    });

    this.wafWebAcl = new aws_wafv2.CfnWebACL(this, "GlobalWebACL", {
      defaultAction: { allow: {} },
      scope: "REGIONAL",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "GlobalWebACLMetric",
        sampledRequestsEnabled: true,
      },
    });

    this.slackAlertTopic = new aws_sns.Topic(this, "SlackAlertTopic", {
      topicName: PhysicalName.GENERATE_IF_NEEDED,
    });
    this.slackInfoTopic = new aws_sns.Topic(this, "SlackInfoTopic", {
      topicName: PhysicalName.GENERATE_IF_NEEDED,
    });

    [this.slackAlertTopic, this.slackInfoTopic].forEach((topic) => {
      topic.addToResourcePolicy(
        new aws_iam.PolicyStatement({
          effect: aws_iam.Effect.ALLOW,
          principals: [new aws_iam.ServicePrincipal("cloudwatch.amazonaws.com")],
          actions: ["sns:Publish"],
          resources: [topic.topicArn],
        })
      );
    });

    const alertChannel = new aws_chatbot.SlackChannelConfiguration(
      this,
      "AlertChannel",
      {
        slackChannelConfigurationName: `${CODE_NAME}_alert`,
        slackChannelId: props.notifySlack.channelId.alert,
        slackWorkspaceId: props.notifySlack.workspaceId,
        guardrailPolicies: [
          aws_iam.ManagedPolicy.fromAwsManagedPolicyName("ReadOnlyAccess"),
        ],
        loggingLevel: aws_chatbot.LoggingLevel.INFO,
        logRetention: aws_logs.RetentionDays.TWO_WEEKS,
      }
    );
    alertChannel.addNotificationTopic(this.slackAlertTopic);

    const infoChannel = new aws_chatbot.SlackChannelConfiguration(
      this,
      "InfoChannel",
      {
        slackChannelConfigurationName: `${CODE_NAME}_info`,
        slackChannelId: props.notifySlack.channelId.info,
        slackWorkspaceId: props.notifySlack.workspaceId,
        guardrailPolicies: [
          aws_iam.ManagedPolicy.fromAwsManagedPolicyName("ReadOnlyAccess"),
        ],
        loggingLevel: aws_chatbot.LoggingLevel.INFO,
        logRetention: aws_logs.RetentionDays.TWO_WEEKS,
      }
    );
    infoChannel.addNotificationTopic(this.slackInfoTopic);

    new aws_ssm.StringParameter(this, "WebAclArnParameter", {
      parameterName: `/${CODE_NAME}/waf/webacl-arn`,
      stringValue: this.wafWebAcl.attrArn,
    });
  }
}
