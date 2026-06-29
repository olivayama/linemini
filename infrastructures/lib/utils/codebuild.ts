import { aws_codebuild } from "aws-cdk-lib";
import { Rds } from "../../construct/rds";

export const codebuildEnvironment = (props?: { privileged?: boolean }) => {
  return {
    privileged: props?.privileged,
    buildImage: aws_codebuild.LinuxBuildImage.STANDARD_7_0,
  };
};

export const codebuildRdsSecrets = (rds: Rds) => {
  return {
    MYSQL_HOST: {
      type: aws_codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
      value: rds.cluster.secret!.secretArn + ":host::",
    },
    MYSQL_PORT: {
      type: aws_codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
      value: rds.cluster.secret!.secretArn + ":port::",
    },
    MYSQL_USER: {
      type: aws_codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
      value: rds.cluster.secret!.secretArn + ":username::",
    },
    MYSQL_PASSWORD: {
      type: aws_codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
      value: rds.cluster.secret!.secretArn + ":password::",
    },
  };
};
