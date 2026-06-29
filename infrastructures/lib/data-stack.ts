import {
  RemovalPolicy,
  Stack,
  StackProps,
  aws_certificatemanager,
  aws_ec2,
  aws_logs,
  aws_rds,
  aws_route53,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Vpc } from "../construct/vpc";
import { AppEnv } from "./utils/env";
import { Rds } from "../construct/rds";
import { Ecr } from "../construct/ecr";
import { S3 } from "../construct/s3";
import { CODE_NAME } from "../constants";

const stackConfiguration = {
  ecr: {
    maxUntaggedImageCount: 10,
  },
  rds: {
    username: "admin",
    database: CODE_NAME,
    mysqlVersion: aws_rds.AuroraMysqlEngineVersion.of(
      "8.0.mysql_aurora.3.12.0",
      "8.0"
    ),
    instanceType: {
      snd: aws_ec2.InstanceType.of(
        aws_ec2.InstanceClass.T4G,
        aws_ec2.InstanceSize.MEDIUM
      ),
      dev: aws_ec2.InstanceType.of(
        aws_ec2.InstanceClass.T4G,
        aws_ec2.InstanceSize.MEDIUM
      ),
      stg: aws_ec2.InstanceType.of(
        aws_ec2.InstanceClass.T4G,
        aws_ec2.InstanceSize.MEDIUM
      ),
      prd: aws_ec2.InstanceType.of(
        aws_ec2.InstanceClass.T4G,
        aws_ec2.InstanceSize.LARGE
      ),
    },
    instanceCount: {
      snd: 1,
      dev: 1,
      stg: 1,
      prd: 2,
    },
    removalPolicy: {
      snd: RemovalPolicy.DESTROY,
      dev: RemovalPolicy.DESTROY,
      stg: RemovalPolicy.DESTROY,
      prd: RemovalPolicy.RETAIN,
    },
  },
  s3: {
    usEast1CertificateArn: "",
    removalPolicy: {
      snd: RemovalPolicy.DESTROY,
      dev: RemovalPolicy.DESTROY,
      stg: RemovalPolicy.DESTROY,
      prd: RemovalPolicy.RETAIN,
    },
  },
};

export class DataStack extends Stack {
  ecr: Ecr;
  rds: Rds;
  s3: S3;
  infraLogGroup: aws_logs.ILogGroup;
  ecsLogGroup: aws_logs.ILogGroup;

  constructor(
    scope: Construct,
    id: string,
    props: StackProps & {
      appEnv: AppEnv;
      vpc: Vpc;
      hostedZone: aws_route53.IHostedZone;
      globalCertificate: aws_certificatemanager.ICertificate;
    }
  ) {
    super(scope, id, props);

    this.infraLogGroup = new aws_logs.LogGroup(this, "InfraLog", {
      retention: aws_logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.ecsLogGroup = new aws_logs.LogGroup(this, "EcsLog", {
      retention: aws_logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.ecr = new Ecr(this, "Ecr", {
      logGroup: this.infraLogGroup,
      releaseTagPrefix: `/${CODE_NAME}/${props.appEnv}/release-tag`,
      maxUntaggedImageCount: stackConfiguration.ecr.maxUntaggedImageCount,
    });

    this.rds = new Rds(this, "Rds", {
      logGroup: this.infraLogGroup,
      vpc: props.vpc,
      database: stackConfiguration.rds.database,
      username: stackConfiguration.rds.username,
      mysqlVersion: stackConfiguration.rds.mysqlVersion,
      instanceType: stackConfiguration.rds.instanceType[props.appEnv],
      instanceCount: stackConfiguration.rds.instanceCount[props.appEnv],
      removalPolicy: stackConfiguration.rds.removalPolicy[props.appEnv],
    });

    this.s3 = new S3(this, "S3", {
      hostedZone: props.hostedZone,
      certificate: props.globalCertificate,
      removalPolicy: stackConfiguration.s3.removalPolicy[props.appEnv],
    });
  }
}
