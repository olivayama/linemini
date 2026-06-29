import { aws_codebuild, aws_secretsmanager } from "aws-cdk-lib";
import { Construct } from "constructs";

export class DockerHub extends Construct {
  secrets: aws_secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: {}) {
    super(scope, id);

    this.secrets = aws_secretsmanager.Secret.fromSecretNameV2(
      this,
      "DockerHubSecret",
      "DockerHubSecret"
    );
  }

  get codeBuildEnvironmentVariables() {
    return {
      DOCKER_HUB_USERNAME: {
        type: aws_codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
        value: this.secrets.secretArn + ":username::",
      },
      DOCKER_HUB_ACCESS_TOKEN: {
        type: aws_codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
        value: this.secrets.secretArn + ":access_token::",
      },
    };
  }
}
