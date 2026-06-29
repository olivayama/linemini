import { RemovalPolicy, aws_lambda, custom_resources } from "aws-cdk-lib";

export const customResourceProviderLogGroupsApplyRemovalPolicy = (
  provider: custom_resources.Provider,
  policy: RemovalPolicy
) => {
  (provider.onEventHandler as aws_lambda.Function).logGroup.applyRemovalPolicy(
    policy
  );

  if (provider.isCompleteHandler) {
    (
      provider.isCompleteHandler as aws_lambda.Function
    ).logGroup.applyRemovalPolicy(policy);
  }
};
