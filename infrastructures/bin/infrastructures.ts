#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/network-stack";
import { DataStack } from "../lib/data-stack";
import { appEnvs } from "../lib/utils/env";
import { toCapitalized } from "../lib/utils/helper";
import { ComputeStack } from "../lib/compute-stack";
import { InitStack } from "../lib/init-stack";
import { CODE_NAME } from "../constants";
import { GlobalCertificateStack } from "../lib/global-certificate-stack";
import { WafCharmStack } from "../lib/wafcharm-stack";

const env = {
  account: "xxxawsaccountidxxx",
  region: "ap-northeast-1",
};

const envGlobal = {
  account: "xxxawsaccountidxxx",
  region: "us-east-1",
};

const notifySlack = {
  workspaceId: "T04Q5G460", // Opt,Inc.
  channelId: {
    alert: "C07N67YKD3P",   // #lineminiapps_alert
    info:  "C0AE1UR9R3R",   // #lineminiapps_info
  },
};

const app = new cdk.App();
const appPrefix = toCapitalized(CODE_NAME);

const initStack = new InitStack(app, `${appPrefix}InitStack`, {
  env,
  terminationProtection: true,
  notifySlack,
});

appEnvs.forEach((appEnv) => {
  const appEnvPrefix = `${appPrefix}${toCapitalized(appEnv)}`;
  const terminationProtection = appEnv === "prd";

  const networkStack = new NetworkStack(app, `${appEnvPrefix}NetworkStack`, {
    env,
    terminationProtection,
    appEnv,
    hostedZone: initStack.envHostedZones[appEnv],
  });

  const globalCertificateStack = new GlobalCertificateStack(
    app,
    `${appEnvPrefix}GlobalCertificateStack`,
    {
      env: envGlobal,
      crossRegionReferences: true,
      terminationProtection,
      appEnv,
      domainName: initStack.envHostedZones[appEnv].zoneName,
      hostedZone: initStack.envHostedZones[appEnv],
    }
  );

  const dataStack = new DataStack(app, `${appEnvPrefix}DataStack`, {
    env,
    crossRegionReferences: true,
    terminationProtection,
    appEnv,
    vpc: networkStack.vpc,
    hostedZone: initStack.envHostedZones[appEnv],
    globalCertificate: globalCertificateStack.certificate,
  });

  new ComputeStack(app, `${appEnvPrefix}ComputeStack`, {
    env,
    terminationProtection,
    ecsLogGroup: dataStack.ecsLogGroup,
    infraLogGroup: dataStack.infraLogGroup,
    appEnv,
    hostedZone: networkStack.hostedZone,
    certificate: networkStack.certificate,
    vpc: networkStack.vpc,
    dockerHub: networkStack.dockerHub,
    rds: dataStack.rds,
    ecr: dataStack.ecr,
    s3: dataStack.s3,
    slackInfoTopic: initStack.slackInfoTopic,
    slackAlertTopic: initStack.slackAlertTopic,
  });
});

const wafcharmStack = new WafCharmStack(app, `${appPrefix}WafCharmStack`, {
  env,
  terminationProtection: false,
  wafWebAcl: initStack.wafWebAcl,
});
