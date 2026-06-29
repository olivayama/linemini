import {
  Duration,
  aws_sns,
  aws_logs,
  aws_lambda,
  aws_lambda_nodejs,
  aws_logs_destinations,
  aws_lambda_destinations,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { AppEnv } from "../lib/utils/env";
import { CODE_NAME } from "../constants";
import { Vpc } from "./vpc";
import path = require("path");

type Props = {
  appEnv: AppEnv,
  vpc: Vpc,
  logGroup: aws_logs.ILogGroup,
  ecsLogGroup: aws_logs.ILogGroup,
  slackAlertTopic: aws_sns.ITopic,
  slackInfoTopic: aws_sns.ITopic,
  alarmTopic: aws_sns.ITopic,
};

export class MonitoringCloudwatchLogs extends Construct {
  public readonly monitoringCloudwatchLogsLambda: aws_lambda.Function;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    this.monitoringCloudwatchLogsLambda = new aws_lambda_nodejs.NodejsFunction(this, 'LogProcessor', {
      entry: path.join(__dirname, "../custom/monitoring-cloudwatch-logs/index.ts"),
      handler: "handler",
      runtime: new aws_lambda.Runtime("nodejs24.x", aws_lambda.RuntimeFamily.NODEJS),
      timeout: Duration.seconds(10),
      memorySize: 160,
      retryAttempts: 0,
      onFailure: new aws_lambda_destinations.SnsDestination(props.alarmTopic),
      environment: {
        APPENV: props.appEnv,
        CODE_NAME: CODE_NAME,
        ALERT_TOPIC_ARN: props.slackAlertTopic.topicArn,
        INFO_TOPIC_ARN: props.slackInfoTopic.topicArn,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: "es2022",
        format: aws_lambda_nodejs.OutputFormat.ESM,
      },
      logGroup: props.logGroup,
      vpc: props.vpc.main,
      vpcSubnets: props.vpc.main.selectSubnets({
        subnetGroupName: "PrivateWithEgress",
      }),
      securityGroups: [props.vpc.appSecurityGroup],
    });

    props.slackAlertTopic.grantPublish(this.monitoringCloudwatchLogsLambda);
    props.slackInfoTopic.grantPublish(this.monitoringCloudwatchLogsLambda);

    new aws_logs.SubscriptionFilter(this, "NotificationSubscriptionFilter", {
      logGroup: props.ecsLogGroup,
      destination: new aws_logs_destinations.LambdaDestination(this.monitoringCloudwatchLogsLambda),
      filterPattern: aws_logs.FilterPattern.allTerms("[通知]"),
    });
  }
}
