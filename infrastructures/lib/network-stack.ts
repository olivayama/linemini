import {
  Stack,
  StackProps,
  aws_certificatemanager,
  aws_ec2,
  aws_route53,
  aws_lambda,
  Aspects,
} from "aws-cdk-lib";
import { IConstruct } from "constructs";
import { CertificateWithCleanup } from "@servicevic-oss/cdk-cleanup-certificate-validation-records";
import { Construct } from "constructs";
import { Vpc } from "../construct/vpc";
import { AppEnv } from "./utils/env";
import { DockerHub } from "../construct/docker-hub";

const stackConfiguration = {
  mainCidr: {
    snd: "10.19.0.0/16",
    dev: "10.20.0.0/16",
    prd: "10.21.0.0/16",
    stg: "10.22.0.0/16",
  },
  // maxAzs は後から減らせないので注意する。
  // Aurora cluster が最低2つの AZ を要求する。
  maxAzs: {
    snd: 2,
    dev: 2,
    stg: 2,
    prd: 2,
  },
  certArn: { // arn:aws:acm:ap-northeast-1:xxxxxxxxxxxx:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    snd: "",
    dev: "",
    stg: "",
    prd: "",
  },
};

export class NetworkStack extends Stack {
  vpc: Vpc;
  // publicDomain: PublicDomain;
  appSecurityGroup: aws_ec2.ISecurityGroup;
  dockerHub: DockerHub;
  hostedZone: aws_route53.IHostedZone;
  certificate: aws_certificatemanager.ICertificate;

  constructor(
    scope: Construct,
    id: string,
    props: StackProps & {
      appEnv: AppEnv;
      hostedZone: aws_route53.IHostedZone;
    }
  ) {
    super(scope, id, props);

    this.dockerHub = new DockerHub(this, "DockerHub", {});

    this.vpc = new Vpc(this, "Vpc", {
      appEnv: props.appEnv,
      mainCidr: stackConfiguration.mainCidr[props.appEnv],
      maxAzs: stackConfiguration.maxAzs[props.appEnv],
    });

    this.hostedZone = props.hostedZone;

    if (stackConfiguration.certArn[props.appEnv]) {
      this.certificate = aws_certificatemanager.Certificate.fromCertificateArn(
        this,
        "RegionalCertificate",
        stackConfiguration.certArn[props.appEnv],
      );
    } else {
      const subjectAlternativeNames = [`*.${props.hostedZone.zoneName}`];
      this.certificate = new CertificateWithCleanup(
        this,
        "RegionalCertificate",
        {
          domainName: props.hostedZone.zoneName,
          subjectAlternativeNames,
          validation: aws_certificatemanager.CertificateValidation.fromDns(
            props.hostedZone
          ),
        }
      );
    }

    Aspects.of(this).add({
      visit(node: IConstruct) {
        if (
          node instanceof aws_lambda.CfnFunction &&
          node.runtime === "nodejs20.x"
        ) {
          node.addPropertyOverride("Runtime", "nodejs24.x");
        }
      },
    });
  }
}
