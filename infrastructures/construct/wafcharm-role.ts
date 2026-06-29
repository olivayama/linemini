import { aws_iam, aws_s3 } from "aws-cdk-lib";
import { Construct } from "constructs";

type Props = {
  bucket: aws_s3.IBucket;
  externalId: string;
  principals: string[];
  managedPolicies: string[];
};

export class WafCharmRole extends Construct {
  wafCharmRole: aws_iam.Role;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const principals = props.principals.map(
      (accountId) =>
        new aws_iam.PrincipalWithConditions(
          new aws_iam.AccountPrincipal(accountId),
          {
            StringEquals: {
              "sts:ExternalId": props.externalId,
            },
          }
        )
    );

    const compositePrincipal = new aws_iam.CompositePrincipal(...principals);

    this.wafCharmRole = new aws_iam.Role(this, "WafCharmRole", {
      assumedBy: compositePrincipal,
      managedPolicies: props.managedPolicies.map((name) =>
        aws_iam.ManagedPolicy.fromAwsManagedPolicyName(name)
      ),
      path: "/",
    });

    const bucketReadOnlyPolicy = new aws_iam.Policy(
      this,
      "WafCharmBucketReadOnly",
      {
        statements: [
          new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: ["s3:List*", "s3:Get*"],
            resources: [
              props.bucket.bucketArn,
              props.bucket.arnForObjects("*"),
            ],
          }),
        ],
      }
    );
    this.wafCharmRole.attachInlinePolicy(bucketReadOnlyPolicy);
  }
}
