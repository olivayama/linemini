import { Stack, aws_ecs } from "aws-cdk-lib";
import { Rds } from "../../construct/rds";
import { Construct } from "constructs";

export const ecsRdsSecrets = (rds: Rds) => {
  return {
    MYSQL_HOST: aws_ecs.Secret.fromSecretsManager(rds.cluster.secret!, "host"),
    MYSQL_PORT: aws_ecs.Secret.fromSecretsManager(rds.cluster.secret!, "port"),
    MYSQL_USER: aws_ecs.Secret.fromSecretsManager(
      rds.cluster.secret!,
      "username"
    ),
    MYSQL_PASSWORD: aws_ecs.Secret.fromSecretsManager(
      rds.cluster.secret!,
      "password"
    ),
  };
};

export const ecrLogin = (scope: Construct) => {
  return `aws ecr get-login-password | docker login --username AWS --password-stdin "${ecrRepositoryUri(
    Stack.of(scope)
  )}"`;
};

const ecrRepositoryUri = (stack: Stack) => {
  return `https://${stack.account}.dkr.ecr.${stack.region}.amazonaws.com`;
};
