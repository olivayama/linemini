import { RemovalPolicy, Stack, StackProps, aws_iam, aws_s3, aws_wafv2 } from "aws-cdk-lib";
import { Construct } from "constructs";
import { WafCharmS3 } from "../construct/wafcharm-s3";
import { WafCharmRole } from "../construct/wafcharm-role";
import { CODE_NAME } from "../constants";

const stackConfiguration = {
  wafcharm: {
    externalId: "XXXXXXXXXXXX",
    principals: ["311635851477", "347433978697"],
    managedPolicies: ["AWSWAFFullAccess", "CloudWatchReadOnlyAccess"],
  },
};

export class WafCharmStack extends Stack {
  readonly wafCharmBucket: aws_s3.IBucket;
  readonly wafCharmRole: aws_iam.Role;

  constructor(
    scope: Construct,
    id: string,
    props: StackProps & { wafWebAcl: aws_wafv2.CfnWebACL }
  ) {
    super(scope, id, props);

    this.wafCharmBucket = new WafCharmS3(this, "WafCharmS3").wafcharmBucket;

    this.wafCharmRole = new WafCharmRole(this, "WafCharmRoleConstruct", {
      bucket: this.wafCharmBucket,
      externalId: stackConfiguration.wafcharm.externalId,
      principals: stackConfiguration.wafcharm.principals,
      managedPolicies: stackConfiguration.wafcharm.managedPolicies,
    }).wafCharmRole;

    new aws_wafv2.CfnLoggingConfiguration(this, "WafCharmWafLogConfig", {
      resourceArn: props.wafWebAcl.attrArn,
      logDestinationConfigs: [this.wafCharmBucket.bucketArn],
    });
  }
}
