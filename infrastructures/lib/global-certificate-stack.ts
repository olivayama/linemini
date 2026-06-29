import { Construct } from "constructs";
import {
  aws_route53,
  aws_certificatemanager,
  StackProps,
  Stack,
} from "aws-cdk-lib";
import { AppEnv } from "./utils/env";

const stackConfiguration = {
  certArn: { // arn:aws:acm:us-east-1:xxxxxxxxxxxx:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    snd: "",
    dev: "",
    stg: "",
    prd: "",
  },
};

export class GlobalCertificateStack extends Stack {
  certificate: aws_certificatemanager.ICertificate;

  constructor(
    scope: Construct,
    id: string,
    props: StackProps & {
      appEnv: AppEnv;
      domainName: string;
      hostedZone: aws_route53.IHostedZone;
    }
  ) {
    super(scope, id, props);

    const hostedZone = props.hostedZone;

    if (stackConfiguration.certArn[props.appEnv]) {
      this.certificate = aws_certificatemanager.Certificate.fromCertificateArn(
        this,
        "GlobalCertificate",
        stackConfiguration.certArn[props.appEnv],
      );
    } else {
      this.certificate = new aws_certificatemanager.Certificate(
        this,
        "GlobalCertificate",
        {
          domainName: props.domainName,
          subjectAlternativeNames: [`*.${props.domainName}`],
          validation:
            aws_certificatemanager.CertificateValidation.fromDns(hostedZone),
        }
      );
    }
  }
}
