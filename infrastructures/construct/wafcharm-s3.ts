import { aws_s3, RemovalPolicy, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";

export class WafCharmS3 extends Construct {
  wafcharmBucket: aws_s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const stack = Stack.of(scope);
    const stackNameNormalized = stack.stackName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
    const bucketName = `aws-waf-logs-${stackNameNormalized}-${stack.account}-${stack.region}`.slice(0, 63);

    this.wafcharmBucket = new aws_s3.Bucket(this, "WafCharmBucket", {
      bucketName,
      versioned: true,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: Duration.days(3),
          noncurrentVersionsToRetain: 3,
        },
      ],
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });
  }
}
