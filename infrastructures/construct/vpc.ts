import {
  aws_ec2,
  aws_ecs,
  aws_logs,
  aws_servicediscovery,
  RemovalPolicy,
} from "aws-cdk-lib";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { AppEnv } from "../lib/utils/env";

export class Vpc extends Construct {
  main: aws_ec2.IVpc;
  mainEcsCluster: aws_ecs.ICluster;
  mainEcsNamepace: aws_servicediscovery.INamespace;
  appSecurityGroup: aws_ec2.ISecurityGroup;
  rdsSecurityGroup: aws_ec2.ISecurityGroup;

  constructor(
    scope: Construct,
    id: string,
    props: {
      appEnv: AppEnv;
      mainCidr: string;
      maxAzs: number;
    }
  ) {
    super(scope, id);

    const mainVpcFlowLogs = new aws_logs.LogGroup(this, "MainVpcFlowLog", {
      retention: RetentionDays.THREE_DAYS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.main = new aws_ec2.Vpc(this, "Main", {
      flowLogs: {
        vpcFlowLog: {
          destination:
            aws_ec2.FlowLogDestination.toCloudWatchLogs(mainVpcFlowLogs),
          trafficType: aws_ec2.FlowLogTrafficType.ALL,
        },
      },
      ipAddresses: aws_ec2.IpAddresses.cidr(props.mainCidr),
      maxAzs: props.maxAzs,
      reservedAzs: 4 - props.maxAzs,
      subnetConfiguration: [
        // x.x.0.0/22
        {
          cidrMask: 24,
          name: "Public",
          subnetType: aws_ec2.SubnetType.PUBLIC,
        },
        // x.x.4.0/22
        {
          cidrMask: 24,
          name: "PrivateIsolated",
          subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED,
        },
        // x.x.8.0/22
        {
          cidrMask: 24,
          name: "PrivateWithEgress",
          subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Fargate のデプロイで
    // dial tcp: lookup 277055298007.dkr.ecr.ap-northeast-1.amazonaws.com on x.x.x.x:y: no such host
    // が出る場合、一度 ecr-endpoint / ecr-dkr-endpoint をコメントアウトして一度消してから再作成すると直る...
    this.main.addInterfaceEndpoint("ecr-endpoint", {
      service: aws_ec2.InterfaceVpcEndpointAwsService.ECR,
    });
    this.main.addInterfaceEndpoint("ecr-dkr-endpoint", {
      service: aws_ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
    });
    this.main.addInterfaceEndpoint("logs-endpoint", {
      service: aws_ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
    });
    this.main.addInterfaceEndpoint("secrets-manager-endpoint", {
      service: aws_ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });
    this.main.addInterfaceEndpoint("sns-endpoint", {
      service: aws_ec2.InterfaceVpcEndpointAwsService.SNS,
    });
    this.main.addInterfaceEndpoint('ses-endpoint', {
      service: aws_ec2.InterfaceVpcEndpointAwsService.EMAIL_SMTP,
    });
    this.main.addInterfaceEndpoint("ssm-endpoint", {
      service: aws_ec2.InterfaceVpcEndpointAwsService.SSM,
    });
    this.main.addInterfaceEndpoint("ssm-messages-endpoint", {
      service: aws_ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
    });
    this.main.addInterfaceEndpoint("ec2-messages-endpoint", {
      service: aws_ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
    });
    this.main.addGatewayEndpoint("s3-endpoint", {
      service: aws_ec2.GatewayVpcEndpointAwsService.S3,
    });

    this.appSecurityGroup = new aws_ec2.SecurityGroup(
      this,
      "AppSecurityGroup",
      {
        vpc: this.main,
      }
    );

    this.appSecurityGroup.addIngressRule(
      aws_ec2.Peer.anyIpv4(),
      aws_ec2.Port.allTcp()
    );

    this.rdsSecurityGroup = new aws_ec2.SecurityGroup(
      this,
      "RdsClusterSecurityGroup",
      {
        vpc: this.main,
      }
    );
    // Allow ingress from App
    this.rdsSecurityGroup.connections.allowFrom(
      this.appSecurityGroup,
      aws_ec2.Port.tcp(3306)
    );
    this.appSecurityGroup.connections.allowFrom(
      this.appSecurityGroup,
      aws_ec2.Port.allTraffic()
    );

    const cluster = new aws_ecs.Cluster(this, "MainEcsCluster", {
      vpc: this.main,
    });
    this.mainEcsCluster = cluster;

    this.mainEcsNamepace = cluster.addDefaultCloudMapNamespace({
      name: `local-${props.appEnv}`,
    });
    this.mainEcsNamepace.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
