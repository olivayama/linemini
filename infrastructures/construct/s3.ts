import {
  aws_certificatemanager,
  aws_cloudfront,
  aws_cloudfront_origins,
  aws_route53,
  aws_route53_targets,
  aws_s3,
  Duration,
  RemovalPolicy,
} from "aws-cdk-lib";
import { Construct } from "constructs";

type Props = {
  hostedZone: aws_route53.IHostedZone;
  certificate: aws_certificatemanager.ICertificate;
  removalPolicy: RemovalPolicy;
};

export class S3 extends Construct {
  publicBucket: aws_s3.IBucket;
  publicBucketDomainName: string;
  privateBucket: aws_s3.IBucket;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    this.publicBucket = new aws_s3.Bucket(this, "PublicBucket", {
      versioned: true,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: Duration.days(3),
          noncurrentVersionsToRetain: 3,
        },
      ],
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props.removalPolicy,
      autoDeleteObjects: props.removalPolicy === RemovalPolicy.DESTROY,
    });

    this.privateBucket = new aws_s3.Bucket(this, "PrivateBucket", {
      versioned: true,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: Duration.days(3),
          noncurrentVersionsToRetain: 3,
        },
      ],
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props.removalPolicy,
      autoDeleteObjects: props.removalPolicy === RemovalPolicy.DESTROY,
    });

    const publicBucketOai = new aws_cloudfront.OriginAccessIdentity(
      this,
      "PublicBucketOai"
    );
    this.publicBucket.grantRead(publicBucketOai);
    this.publicBucketDomainName = `public.${props.hostedZone.zoneName}`;

    const publicBucketDistribution = new aws_cloudfront.Distribution(
      this,
      "PublicBucketDistribution",
      {
        defaultBehavior: {
          origin: aws_cloudfront_origins.S3BucketOrigin.withOriginAccessControl(this.publicBucket),
          responseHeadersPolicy:
            aws_cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
          cachePolicy: aws_cloudfront.CachePolicy.CACHING_OPTIMIZED,
          allowedMethods: aws_cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          viewerProtocolPolicy:
            aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        defaultRootObject: "index.html",
        certificate: props.certificate,
        domainNames: [this.publicBucketDomainName],
        priceClass: aws_cloudfront.PriceClass.PRICE_CLASS_200,
      }
    );

    new aws_route53.AaaaRecord(this, `PublicAaaaRecord`, {
      zone: props.hostedZone,
      recordName: this.publicBucketDomainName,
      target: aws_route53.RecordTarget.fromAlias(
        new aws_route53_targets.CloudFrontTarget(publicBucketDistribution)
      ),
    }).applyRemovalPolicy(RemovalPolicy.DESTROY);

    new aws_route53.ARecord(this, `PublicARecord`, {
      zone: props.hostedZone,
      recordName: this.publicBucketDomainName,
      target: aws_route53.RecordTarget.fromAlias(
        new aws_route53_targets.CloudFrontTarget(publicBucketDistribution)
      ),
    }).applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
