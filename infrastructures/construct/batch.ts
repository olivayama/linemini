import {
  Duration,
  aws_ec2,
  aws_events,
  aws_events_targets,
  aws_lambda,
  aws_lambda_nodejs,
  aws_logs,
  aws_secretsmanager,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { AppEnv } from "../lib/utils/env";
import { CODE_NAME } from "../constants";
import { Vpc } from "./vpc";
import path = require("path");

type BatchScheduleConfig = {
  name: string,
  description: string,
  schedule: aws_events.Schedule,
  event: {
    name: string,
    method: string,
    path: string,
    contentType?: string,
    body?: string,
  }
}

type Props = {
  appEnv: AppEnv,
  functionName: string,
  logGroup: aws_logs.ILogGroup,
  apiBaseUrl: string,
  apiWebhookToken: aws_secretsmanager.ISecret,
  vpc: Vpc,
  schedules: BatchScheduleConfig[],
}

export class Batch extends Construct {
  public readonly launchApiCallLambda: aws_lambda.Function;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const functionEntry = path.join(__dirname, "../custom/launch-api-call/index.ts");

    this.launchApiCallLambda = new aws_lambda_nodejs.NodejsFunction(this, "LaunchApiCall", {
      functionName: `${CODE_NAME}-${props.appEnv}-${props.functionName}`,
      entry: functionEntry,
      handler: "handler",
      runtime: new aws_lambda.Runtime("nodejs24.x", aws_lambda.RuntimeFamily.NODEJS),
      timeout: Duration.seconds(60),
      memorySize: 160,
      retryAttempts: 0,
      logGroup: props.logGroup,
      vpc: props.vpc.main,
      vpcSubnets: props.vpc.main.selectSubnets({
        subnetGroupName: "PrivateWithEgress",
      }),
      securityGroups: [props.vpc.appSecurityGroup],
      environment: {
        API_BASE_URL: props.apiBaseUrl,
        API_WEBHOOK_TOKEN_SECRET_NAME: props.apiWebhookToken.secretName,
        NODE_OPTIONS: "--enable-source-maps",
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: "es2022",
        format: aws_lambda_nodejs.OutputFormat.ESM,
        externalModules: ["@aws-sdk/client-secrets-manager"],
      },
    });

    props.apiWebhookToken.grantRead(this.launchApiCallLambda);

    props.schedules.forEach((scheduleConfig) => {
      const rule = new aws_events.Rule(this, `${CODE_NAME}-${props.appEnv}-${scheduleConfig.name}-rule`, {
        ruleName: `${CODE_NAME}-${props.appEnv}-${scheduleConfig.name}`,
        description: scheduleConfig.description,
        schedule: scheduleConfig.schedule,
        enabled: true,
      });

      rule.addTarget(
        new aws_events_targets.LambdaFunction(this.launchApiCallLambda, {
          event: aws_events.RuleTargetInput.fromObject({
            detail: scheduleConfig.event,
          }),
        })
      );
    });
  }
}
