import {
  aws_iam,
  aws_codebuild,
  aws_codepipeline,
  aws_codepipeline_actions,
  aws_s3,
  Duration,
  RemovalPolicy,
  aws_logs,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  codebuildEnvironment,
  codebuildRdsSecrets,
} from "../lib/utils/codebuild";
import { Rds } from "./rds";
import { Ecr } from "./ecr";
import { DockerHub } from "./docker-hub";
import { Vpc } from "./vpc";
import { ecrLogin } from "../lib/utils/ecs";
import { Fargate } from "./fargate";

type Props = {
  logGroup: aws_logs.ILogGroup;
  vpc: Vpc;
  dockerHub: DockerHub;
  rds: Rds;
  ecr: Ecr;
  fargateApi: Fargate;
  fargateWeb: Fargate;
  fargateWebNextPublicEnvironments?: {
    [name: string]: aws_codebuild.BuildEnvironmentVariable;
  };
  releaseTagApiKey: string;
  releaseTagWebNginxKey: string;
  releaseTagWebKey: string;
  github: {
    codeStarConnectionArn: string;
    owner: string;
    repo: string;
    branch: string;
  };
};

export class Pipeline extends Construct {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const buildArtifact = new aws_codepipeline.Artifact(`BuildArtifact`);
    const build = new aws_codebuild.PipelineProject(this, `Build`, {
      logging: {
        cloudWatch: {
          logGroup: props.logGroup,
          prefix: "pipeline/build",
        },
      },
      environment: codebuildEnvironment({
        privileged: true,
      }),
      cache: aws_codebuild.Cache.local(
        aws_codebuild.LocalCacheMode.DOCKER_LAYER
      ),
      environmentVariables: {
        ...props.dockerHub.codeBuildEnvironmentVariables,
        ...props.fargateWebNextPublicEnvironments,
        REPOSITORY_URI_WEB: {
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: props.ecr.webAppRepository.repositoryUri,
        },
        REPOSITORY_URI_WEB_NGINX: {
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: props.ecr.webNginxRepository.repositoryUri,
        },
        REPOSITORY_URI_API: {
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: props.ecr.apiAppRepository.repositoryUri,
        },
      },
      buildSpec: aws_codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          pre_build: {
            commands: [
              `TAG="$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | head -c 8)"`,
              `IMAGE_URI_WEB="$REPOSITORY_URI_WEB:$TAG"`,
              `IMAGE_URI_WEB_NGINX="$REPOSITORY_URI_WEB_NGINX:$TAG"`,
              `IMAGE_URI_API="$REPOSITORY_URI_API:$TAG"`,
            ],
          },
          build: {
            commands: [
              "echo $DOCKER_HUB_ACCESS_TOKEN | docker login --username $DOCKER_HUB_USERNAME --password-stdin",
              `printenv | sort | grep NEXT_PUBLIC_ > apps/web/.env.production`,
              `echo "$TAG" > apps/web/public/_tag.txt`,
              `echo "$TAG" > apps/api/public/_tag.txt`,
              `docker build --target api -f docker/nodejs/Dockerfile.production -t $IMAGE_URI_API .`,
              `docker build --target web -f docker/nodejs/Dockerfile.production -t $IMAGE_URI_WEB .`,
              `docker build -f docker/nginx/web/Dockerfile.production -t $IMAGE_URI_WEB_NGINX .`,
            ],
          },
          post_build: {
            commands: [
              "docker logout",
              ecrLogin(this),
              `docker push $IMAGE_URI_API`,
              `docker push $IMAGE_URI_WEB_NGINX`,
              `docker push $IMAGE_URI_WEB`,
              "docker logout",
              `printf '[{ "name":"%s", "imageUri":"%s" }]' app "$IMAGE_URI_API" > images_api.json`,
              `printf '[{ "name":"%s", "imageUri":"%s" }, { "name":"%s", "imageUri":"%s" }]' app "$IMAGE_URI_WEB" nginx "$IMAGE_URI_WEB_NGINX" > images_web.json`,
            ],
          },
        },
        artifacts: {
          files: ["images_api.json", "images_web.json"],
        },
      }),
    });
    build.addToRolePolicy(
      new aws_iam.PolicyStatement({
        resources: ["*"],
        actions: ["ecs:Describe*"],
      })
    );

    const finalize = new aws_codebuild.PipelineProject(this, `Finalize`, {
      logging: {
        cloudWatch: {
          logGroup: props.logGroup,
          prefix: "pipeline/finalize",
        },
      },
      environment: codebuildEnvironment({
        privileged: true,
      }),
      buildSpec: aws_codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          pre_build: {
            commands: [
              `TAG="$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | head -c 8)"`,
            ],
          },
          build: {
            commands: [
              `aws ssm put-parameter --name ${props.releaseTagApiKey} --overwrite --value "$TAG"`,
              `aws ssm put-parameter --name ${props.releaseTagWebNginxKey} --overwrite --value "$TAG"`,
              `aws ssm put-parameter --name ${props.releaseTagWebKey} --overwrite --value "$TAG"`,
            ],
          },
        },
      }),
    });
    build.addToRolePolicy(
      new aws_iam.PolicyStatement({
        resources: ["*"],
        actions: ["ecr:*"],
      })
    );
    finalize.addToRolePolicy(
      new aws_iam.PolicyStatement({
        resources: ["*"],
        actions: ["ecr:*", "ssm:PutParameter"],
      })
    );

    const migrate = new aws_codebuild.PipelineProject(this, "Migrate", {
      logging: {
        cloudWatch: {
          logGroup: props.logGroup,
          prefix: "pipeline/migrate",
        },
      },
      environment: codebuildEnvironment(),
      vpc: props.vpc.main,
      subnetSelection: props.vpc.main.selectSubnets({
        subnetGroupName: "PrivateWithEgress",
      }),
      securityGroups: [props.vpc.appSecurityGroup],
      environmentVariables: {
        ...codebuildRdsSecrets(props.rds),
        MYSQL_DATABASE: {
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: props.rds.database,
        },
        GOOSE_VERSION: {
          type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: "v3.10.0",
        },
      },
      buildSpec: aws_codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: [
              `apt update`,
              `apt -y install mysql-client`,
              `curl -Lo /usr/local/bin/goose "https://github.com/pressly/goose/releases/download/$GOOSE_VERSION/goose_linux_x86_64"`,
              `chmod +x /usr/local/bin/goose`,
            ],
          },
          build: {
            commands: [`./devtools/goose validate`, `./devtools/goose up`],
          },
        },
      }),
    });

    const codePipelineRole = new aws_iam.Role(this, "Role", {
      assumedBy: new aws_iam.ServicePrincipal("codepipeline.amazonaws.com"),
      managedPolicies: [
        aws_iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
        aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonEC2ContainerRegistryPowerUser"
        ),
        aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AWSCodeBuildAdminAccess"
        ),
        aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AWSCodeDeployFullAccess"
        ),
        aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AWSCodePipeline_FullAccess"
        ),
      ],
    });

    const sourceArtifact = new aws_codepipeline.Artifact("SourceArtifact");

    const artifactBucket = new aws_s3.Bucket(this, "ArtifactBucket", {
      versioned: true,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: Duration.days(3),
          noncurrentVersionsToRetain: 3,
        },
      ],
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new aws_codepipeline.Pipeline(this, "Pipeline", {
      role: codePipelineRole,
      artifactBucket,
      pipelineType: aws_codepipeline.PipelineType.V2,
      stages: [
        {
          stageName: "Source",
          actions: [
            new aws_codepipeline_actions.CodeStarConnectionsSourceAction({
              actionName: "GitHub",
              owner: props.github.owner,
              repo: props.github.repo,
              connectionArn: props.github.codeStarConnectionArn,
              output: sourceArtifact,
              branch: props.github.branch,
            }),
          ],
        },

        {
          stageName: "Build",
          actions: [
            new aws_codepipeline_actions.CodeBuildAction({
              actionName: `DockerImage`,
              project: build,
              input: sourceArtifact,
              outputs: [buildArtifact],
            }),
            new aws_codepipeline_actions.CodeBuildAction({
              actionName: "DatabaseSchema",
              project: migrate,
              input: sourceArtifact,
            }),
          ],
        },
        {
          stageName: "Deploy",
          actions: [
            new aws_codepipeline_actions.EcsDeployAction({
              actionName: "API",
              service: props.fargateApi.service,
              imageFile: buildArtifact.atPath("images_api.json"),
              runOrder: 1,
            }),
            new aws_codepipeline_actions.EcsDeployAction({
              actionName: "Web",
              service: props.fargateWeb.service,
              imageFile: buildArtifact.atPath("images_web.json"),
              runOrder: 2,
            }),
            new aws_codepipeline_actions.CodeBuildAction({
              actionName: "PutTagToSSM",
              project: finalize,
              input: sourceArtifact,
              runOrder: 3,
            }),
          ],
        },
      ],
    });
  }
}
