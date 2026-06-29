import {
  aws_codebuild,
  aws_ec2,
  aws_iam,
  aws_lambda,
  aws_lambda_nodejs,
  aws_logs,
  aws_rds,
  CfnOutput,
  custom_resources,
  CustomResource,
  Duration,
  RemovalPolicy,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Vpc } from "./vpc";
import path = require("path");
import { customResourceProviderLogGroupsApplyRemovalPolicy } from "../lib/utils/custom-resources";

export class Rds extends Construct {
  cluster: aws_rds.DatabaseCluster;
  database: string;

  constructor(
    scope: Construct,
    id: string,
    props: {
      logGroup: aws_logs.ILogGroup;
      vpc: Vpc;
      username: string;
      mysqlVersion: aws_rds.AuroraMysqlEngineVersion;
      database: string;
      instanceType: aws_ec2.InstanceType;
      instanceCount: number;
      removalPolicy: RemovalPolicy;
    }
  ) {
    super(scope, id);

    this.database = props.database;

    this.cluster = new aws_rds.DatabaseCluster(this, "Cluster", {
      engine: aws_rds.DatabaseClusterEngine.auroraMysql({
        version: props.mysqlVersion,
      }),
      credentials: aws_rds.Credentials.fromGeneratedSecret(props.username),
      writer: aws_rds.ClusterInstance.provisioned("writer", {
        instanceType: props.instanceType,
      }),
      readers: Array.from({ length: props.instanceCount - 1 }, (_, i) =>
        aws_rds.ClusterInstance.serverlessV2("reader1", {
          scaleWithWriter: i === 0,
        })
      ),
      vpc: props.vpc.main,
      vpcSubnets: props.vpc.main.selectSubnets({
        subnetGroupName: "PrivateIsolated",
      }),
      storageEncrypted: true,
      securityGroups: [props.vpc.rdsSecurityGroup],
      instanceUpdateBehaviour: aws_rds.InstanceUpdateBehaviour.ROLLING,
      removalPolicy: props.removalPolicy,
    });

    // CREATE DATABASE 等、CDK で実行しにくいデータベースの初期化処理を行なう

    const createDatabaseSql = `CREATE DATABASE IF NOT EXISTS ${props.database} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`;

    // https://github.com/cdklabs/cdk-docker-image-deployment/blob/main/src/docker-image-deployment.ts
    const initializeCodeBuild = new aws_codebuild.Project(
      this,
      "InitDbCodeBuild",
      {
        vpc: props.vpc.main,
        subnetSelection: props.vpc.main.selectSubnets({
          subnetGroupName: "PrivateWithEgress",
        }),
        logging: {
          cloudWatch: {
            logGroup: props.logGroup,
            prefix: "rds/initialize",
          },
        },
        securityGroups: [props.vpc.appSecurityGroup],
        environment: {
          privileged: true,
          buildImage: aws_codebuild.LinuxBuildImage.STANDARD_7_0,
        },
        environmentVariables: {
          MYSQL_HOST: {
            type: aws_codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
            value: `${this.cluster.secret?.secretArn}:host::`,
          },
          MYSQL_PORT: {
            type: aws_codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
            value: `${this.cluster.secret?.secretArn}:port::`,
          },
          MYSQL_USER: {
            type: aws_codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
            value: `${this.cluster.secret?.secretArn}:username::`,
          },
          MYSQL_PASSWORD: {
            type: aws_codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
            value: `${this.cluster.secret?.secretArn}:password::`,
          },
          CREATE_DATABASE_SQL: {
            type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: createDatabaseSql,
          },
        },
        buildSpec: aws_codebuild.BuildSpec.fromObject({
          version: "0.2",
          phases: {
            install: {
              commands: ["apt update -y", "apt install -y mysql-client"],
            },
            build: {
              commands: [
                "echo 'Initialize RDS'",
                'echo "$CREATE_DATABASE_SQL" | mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD"',
              ],
            },
          },
        }),
      }
    );

    const initializeFunctionEntry = path.join(
      __dirname,
      "../custom/trigger-codebuild/index.ts"
    );

    const onEventHandler = new aws_lambda_nodejs.NodejsFunction(
      this,
      "InitDbOnEvent",
      {
        entry: initializeFunctionEntry,
        handler: "onEventHandler",
        runtime: new aws_lambda.Runtime("nodejs24.x", aws_lambda.RuntimeFamily.NODEJS),
        logGroup: props.logGroup,
      }
    );

    const isCompleteHandler = new aws_lambda_nodejs.NodejsFunction(
      this,
      "InitDbIsComplete",
      {
        entry: initializeFunctionEntry,
        handler: "isCompleteHandler",
        runtime: new aws_lambda.Runtime("nodejs24.x", aws_lambda.RuntimeFamily.NODEJS),
        logGroup: props.logGroup,
      }
    );

    // https://github.com/aws/aws-cdk/issues/21721 issue to add grant methods to codebuild
    const grantOnEvent = aws_iam.Grant.addToPrincipal({
      grantee: onEventHandler,
      actions: ["codebuild:StartBuild"],
      resourceArns: [initializeCodeBuild.projectArn],
      scope: this,
    });

    const grantIsComplete = aws_iam.Grant.addToPrincipal({
      grantee: isCompleteHandler,
      actions: ["codebuild:ListBuildsForProject", "codebuild:BatchGetBuilds"],
      resourceArns: [initializeCodeBuild.projectArn],
      scope: this,
    });

    // NOTE: 現在 custom_resources.Provider で logGroup を設定する方法がなく、複数の LogGroup が作成される
    //       特に嬉しいこともないので、対応されたら共通の logGroup を使うようにしたい
    const initDblogGroup = new aws_logs.LogGroup(this, "InitDbLogGroup", {
      retention: aws_logs.RetentionDays.ONE_WEEK,
    });
    const initDb = new custom_resources.Provider(this, "InitDb", {
      onEventHandler: onEventHandler,
      isCompleteHandler: isCompleteHandler,
      queryInterval: Duration.seconds(30),
      totalTimeout: Duration.minutes(30),
      logGroup: initDblogGroup,
    });
    customResourceProviderLogGroupsApplyRemovalPolicy(
      initDb,
      RemovalPolicy.DESTROY
    );

    this.cluster.secret?.grantRead(initDb.onEventHandler);

    const customResource = new CustomResource(
      this,
      // CodeBuild を 再実行するには CustomResource の作成 or 更新が必要なため
      // 再実行が必要な場合は、末尾の V{N} 部分をインクリメントすることでリソースの再作成を行なう
      "InitDbV1",
      {
        serviceToken: initDb.serviceToken,
        properties: {
          projectName: initializeCodeBuild.projectName,
        },
      }
    );

    customResource.node.addDependency(
      this.cluster,
      grantOnEvent,
      grantIsComplete
    );

    try {
      new CfnOutput(this, "CustomResourceReport", {
        value: `${customResource.getAttString(
          "Status"
        )}, see the logs here: ${customResource.getAtt("LogsUrl")}`,
      });
    } catch (error) {
      throw new Error("Error getting the report from the custom resource");
    }
  }
}
