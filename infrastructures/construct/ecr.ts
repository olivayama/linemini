import {
  aws_codebuild,
  aws_ecr,
  aws_iam,
  aws_lambda,
  aws_lambda_nodejs,
  aws_logs,
  aws_secretsmanager,
  CfnOutput,
  custom_resources,
  CustomResource,
  Duration,
  RemovalPolicy,
  Stack,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import path = require("path");
import { customResourceProviderLogGroupsApplyRemovalPolicy } from "../lib/utils/custom-resources";

type Props = {
  logGroup: aws_logs.ILogGroup;
  releaseTagPrefix: string;
  maxUntaggedImageCount: number;
};

export class Ecr extends Construct {
  webAppRepository: aws_ecr.IRepository;
  webNginxRepository: aws_ecr.IRepository;
  apiAppRepository: aws_ecr.IRepository;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const dockerHubSecret = aws_secretsmanager.Secret.fromSecretNameV2(
      this,
      "DockerHubSecret",
      "DockerHubSecret"
    );

    this.apiAppRepository = new aws_ecr.Repository(this, "ApiAppRepository", {
      lifecycleRules: [
        {
          maxImageCount: props.maxUntaggedImageCount,
          tagStatus: aws_ecr.TagStatus.UNTAGGED,
        },
      ],
      emptyOnDelete: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.webAppRepository = new aws_ecr.Repository(this, "WebAppRepository", {
      lifecycleRules: [
        {
          maxImageCount: props.maxUntaggedImageCount,
          tagStatus: aws_ecr.TagStatus.UNTAGGED,
        },
      ],
      emptyOnDelete: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.webNginxRepository = new aws_ecr.Repository(
      this,
      "WebNginxRepository",
      {
        lifecycleRules: [
          {
            maxImageCount: props.maxUntaggedImageCount,
            tagStatus: aws_ecr.TagStatus.UNTAGGED,
          },
        ],
        emptyOnDelete: true,
        removalPolicy: RemovalPolicy.DESTROY,
      }
    );

    const entry = path.join(
      __dirname,
      "../custom/set-initial-parameters/index.ts"
    );
    const initTagOnEventHandler = new aws_lambda_nodejs.NodejsFunction(
      this,
      "InitTagOnEvent",
      {
        entry,
        handler: "onEventHandler",
        runtime: new aws_lambda.Runtime("nodejs24.x", aws_lambda.RuntimeFamily.NODEJS),
        logGroup: props.logGroup,
      }
    );
    const initTagIsCompleteHandler = new aws_lambda_nodejs.NodejsFunction(
      this,
      "InitTagIsComplete",
      {
        entry,
        handler: "isCompleteHandler",
        runtime: new aws_lambda.Runtime("nodejs24.x", aws_lambda.RuntimeFamily.NODEJS),
        logGroup: props.logGroup,
      }
    );
    [initTagOnEventHandler, initTagIsCompleteHandler].map((x) =>
      x.addToRolePolicy(
        new aws_iam.PolicyStatement({
          resources: ["*"],
          actions: [
            "ssm:PutParameter",
            "ssm:GetParameter",
            "ssm:DeleteParameter",
          ],
        })
      )
    );

    const initTaglogGroup = new aws_logs.LogGroup(this, "InitTagLogGroup", {
      retention: aws_logs.RetentionDays.ONE_WEEK,
    });
    const initTag = new custom_resources.Provider(this, "InitTag", {
      onEventHandler: initTagOnEventHandler,
      isCompleteHandler: initTagIsCompleteHandler,
      queryInterval: Duration.seconds(30),
      totalTimeout: Duration.minutes(30),
      logGroup: initTaglogGroup,
    });
    customResourceProviderLogGroupsApplyRemovalPolicy(
      initTag,
      RemovalPolicy.DESTROY
    );

    const initTagCr = new CustomResource(
      this,
      // CodeBuild を 再実行するには CustomResource の作成 or 更新が必要なため
      // 再実行が必要な場合は、末尾の V{N} 部分をインクリメントすることでリソースの再作成を行なう
      "InitTagV1",
      {
        serviceToken: initTag.serviceToken,
        properties: {
          parameterNames: [
            `${props.releaseTagPrefix}/api`,
            `${props.releaseTagPrefix}/web-nginx`,
            `${props.releaseTagPrefix}/web`,
          ].join(","),
          parameterValue: "init",
        },
      }
    );

    try {
      // ここで Status を参照しているので isCompleteHandler で .Data.Status の出力が必要
      new CfnOutput(this, "InitTagReport", {
        value: `${initTagCr.getAttString("Status")}`,
      });
    } catch (error) {
      throw new Error(
        "Error getting the report from the custom resource: " + error
      );
    }

    // CDK で実行しにくい ECR リポジトリの初回 push を行なう。
    // cdk-docker-image-deployment などのツールは同じアプローチでパッケージ化してあるが、
    // 毎回 push してしまい CodePipeline と相性が悪いため使わずにあくまで初回の push のみを行なう。

    const stack = Stack.of(this);
    const ecrEndpoint = `${stack.account}.dkr.ecr.${stack.region}.amazonaws.com`;
    const dockerfile = (port: number) =>
      [
        "FROM node:20.17.0-slim",
        "RUN apt update",
        "RUN apt install -y curl wget",
        "RUN mkdir /app",
        "WORKDIR /app",
        `CMD ["node", "-e", "require('http').createServer((req, res) => res.end ('OK')).listen(${port})"]`,
      ].join("\n");

    // https://github.com/cdklabs/cdk-docker-image-deployment/blob/main/src/docker-image-deployment.ts
    const initializeCodeBuild = new aws_codebuild.Project(
      this,
      "InitializeCodeBuild",
      {
        logging: {
          cloudWatch: {
            logGroup: props.logGroup,
            prefix: "ecr/initialize",
          },
        },
        // vpc: props.vpc.main,
        // subnetSelection: props.vpc.main.selectSubnets({
        //   subnetGroupName: "PrivateWithEgress",
        // }),
        // securityGroups: [props.vpc.appSecurityGroup],
        environment: {
          privileged: true,
          buildImage: aws_codebuild.LinuxBuildImage.STANDARD_7_0,
        },
        environmentVariables: {
          DOCKER_HUB_USERNAME: {
            type: aws_codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
            value: dockerHubSecret.secretArn + ":username::",
          },
          DOCKER_HUB_ACCESS_TOKEN: {
            type: aws_codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
            value: dockerHubSecret.secretArn + ":access_token::",
          },
          ECR_ENDPOINT: {
            type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: ecrEndpoint,
          },
          WEB_APP_DOCKERFILE: {
            type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: dockerfile(4001),
          },
          WEB_APP_DEST: {
            type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: `${ecrEndpoint}/${this.webAppRepository.repositoryName}:init`,
          },
          WEB_NGINX_DOCKERFILE: {
            type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: dockerfile(80),
          },
          WEB_NGINX_DEST: {
            type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: `${ecrEndpoint}/${this.webNginxRepository.repositoryName}:init`,
          },
          API_APP_DOCKERFILE: {
            type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: dockerfile(4000),
          },
          API_APP_DEST: {
            type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: `${ecrEndpoint}/${this.apiAppRepository.repositoryName}:init`,
          },
        },
        buildSpec: aws_codebuild.BuildSpec.fromObject({
          version: "0.2",
          phases: {
            build: {
              commands: [
                // configure
                "echo $DOCKER_HUB_ACCESS_TOKEN | docker login --username $DOCKER_HUB_USERNAME --password-stdin",
                // web app build
                'echo "$WEB_APP_DOCKERFILE" > Dockerfile',
                "docker build -t web_app .",
                'docker tag web_app "$WEB_APP_DEST"',
                // web nginx build
                'echo "$WEB_NGINX_DOCKERFILE" > Dockerfile',
                "docker build -t web_nginx .",
                'docker tag web_nginx "$WEB_NGINX_DEST"',
                // api app build
                'echo "$API_APP_DOCKERFILE" > Dockerfile',
                "docker build -t api_app .",
                'docker tag api_app "$API_APP_DEST"',
                // push
                // 既にイメージがある場合は push しない
                "docker logout",
                'aws ecr get-login-password | docker login --username AWS --password-stdin "$ECR_ENDPOINT"',
                'docker push "$WEB_APP_DEST"',
                'docker push "$WEB_NGINX_DEST"',
                'docker push "$API_APP_DEST"',
                "docker logout",
              ],
            },
          },
        }),
      }
    );

    this.webAppRepository.grantPullPush(initializeCodeBuild);
    this.webNginxRepository.grantPullPush(initializeCodeBuild);
    this.apiAppRepository.grantPullPush(initializeCodeBuild);

    {
      const entry = path.join(
        __dirname,
        "../custom/trigger-codebuild/index.ts"
      );
      const onEventHandler = new aws_lambda_nodejs.NodejsFunction(
        this,
        "InitEcrOnEvent",
        {
          entry,
          handler: "onEventHandler",
          runtime: new aws_lambda.Runtime("nodejs24.x", aws_lambda.RuntimeFamily.NODEJS),
          logGroup: props.logGroup,
        }
      );

      const isCompleteHandler = new aws_lambda_nodejs.NodejsFunction(
        this,
        "InitEcrIsComplete",
        {
          entry,
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

      const initEcrlogGroup = new aws_logs.LogGroup(this, "InitEcrLogGroup", {
        retention: aws_logs.RetentionDays.ONE_WEEK,
      });
      const initEcr = new custom_resources.Provider(this, "InitEcr", {
        onEventHandler: onEventHandler,
        isCompleteHandler: isCompleteHandler,
        queryInterval: Duration.seconds(30),
        totalTimeout: Duration.minutes(30),
        logGroup: initEcrlogGroup,
      });
      customResourceProviderLogGroupsApplyRemovalPolicy(
        initEcr,
        RemovalPolicy.DESTROY
      );

      const initEcrCr = new CustomResource(
        this,
        // CodeBuild を 再実行するには CustomResource の作成 or 更新が必要なため
        // 再実行が必要な場合は、末尾の V{N} 部分をインクリメントすることでリソースの再作成を行なう
        "InitEcrV1",
        {
          serviceToken: initEcr.serviceToken,
          properties: {
            projectName: initializeCodeBuild.projectName,
          },
        }
      );
      initEcrCr.node.addDependency(initTagCr, grantOnEvent, grantIsComplete);

      try {
        // ここで Status と LogsUrl を参照しているので isCompleteHandler で .Data.Status の出力が必要
        new CfnOutput(this, "InitEcrReport", {
          value: `${initEcrCr.getAttString(
            "Status"
          )}, see the logs here: ${initEcrCr.getAtt("LogsUrl")}`,
        });
      } catch (error) {
        throw new Error(
          "Error getting the report from the custom resource: " + error
        );
      }
    }
  }
}
