import {
  Stack,
  StackProps,
  aws_certificatemanager,
  aws_codebuild,
  aws_ec2,
  aws_ecs,
  aws_iam,
  aws_events,
  aws_logs,
  aws_route53,
  aws_secretsmanager,
  aws_sns,
  aws_ses,
  aws_ssm,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { AppEnv } from "./utils/env";
import { Fargate } from "../construct/fargate";
import { Vpc } from "../construct/vpc";
import { Rds } from "../construct/rds";
import { S3 } from "../construct/s3";
import { Ecr } from "../construct/ecr";
import { Pipeline } from "../construct/pipeline";
import { DockerHub } from "../construct/docker-hub";
import { Alb } from "../construct/alb";
import { ecsRdsSecrets } from "./utils/ecs";
import { CODE_NAME } from "../constants";
import { Sns } from "../construct/sns";
import { CloudWatchDashboard } from "../construct/cloudwatch-dashboard";
import { Batch } from "../construct/batch";
import { MonitoringCloudwatchLogs } from "../construct/monitoring";

const stackConfiguration = {
  github: {
    // CodeStar Connection は手動で作成する
    codestarConnectionArn:
      "arn:aws:codeconnections:ap-northeast-1:xxxawsaccountidxxx:connection/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    owner: "entermotion-jp",
    repo: CODE_NAME,
    branch: {
      snd: "snd",
      dev: "dev",
      stg: "stg",
      prd: "prd",
    },
  },
  line: {
    liffId: {
      snd: "xxxsndliffidxxx",
      dev: "xxxdevliffidxxx",
      stg: "xxxstgliffidxxx",
      prd: "xxxprdliffidxxx",
    },
  },
  session: {
    name: `${CODE_NAME}_sess`,
    maxAge: 60 * 60 * 24 * 365,
  },
  jwt: {
    issuer: CODE_NAME,
    audience: CODE_NAME,
  },
  autoscaler: {
    snd: 1,
    dev: 1,
    stg: 1,
    prd: 2,
  },
  peakTimes: [
    // 書き方の例
    // {
    //   id: "MessageDelivery_202403201100",
    //   start: {
    //     y: 2024,
    //     m: 3,
    //     d: 20,
    //     h: 0, // 9 in JST
    //     mi: 0,
    //   },
    //   end: {
    //     y: 2024,
    //     m: 3,
    //     d: 20,
    //     h: 5, // 14 in JST
    //     mi: 0,
    //   },
    // },
  ],
  fargate: {
    snd: {
      api: {
        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 1,
      },
      web: {
        cpu: 1024,
        memoryLimitMiB: 2048,
        desiredCount: 1,
      },
    },
    dev: {
      api: {
        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 1,
      },
      web: {
        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 1,
      },
    },
    stg: {
      api: {
        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 1,
      },
      web: {
        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 1,
      },
    },
    prd: {
      api: {
        cpu: 2048,
        memoryLimitMiB: 4096,
        desiredCount: 2,
      },
      web: {
        cpu: 2048,
        memoryLimitMiB: 4096,
        desiredCount: 2,
      },
    },
  },
  albSg: {
    snd: ["0.0.0.0/0"],
    dev: ["0.0.0.0/0"],
    stg: ["0.0.0.0/0"],
    prd: ["0.0.0.0/0"],
  },
  albDomain: {
    snd: {
      Api: "",
      Web: "",
      WebWww: "",
    },
    dev: {
      Api: "",
      Web: "",
      WebWww: "",
    },
    stg: {
      Api: "",
      Web: "",
      WebWww: "",
    },
    prd: {
      Api: "",
      Web: "",
      WebWww: "",
    },
  } as const,
  monitoring: {
    email: [
      "alert_lineminiapps-aaaaodlorrjdl7ntgbscml33dy@digital-g.org.slack.com",
    ],
  },
};

export class ComputeStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: StackProps & {
      appEnv: AppEnv;
      hostedZone: aws_route53.IHostedZone;
      certificate: aws_certificatemanager.ICertificate;
      infraLogGroup: aws_logs.ILogGroup;
      ecsLogGroup: aws_logs.ILogGroup;
      vpc: Vpc;
      dockerHub: DockerHub;
      rds: Rds;
      ecr: Ecr;
      s3: S3;
      slackInfoTopic: aws_sns.ITopic;
      slackAlertTopic: aws_sns.ITopic;
    },
  ) {
    super(scope, id, props);

    const sns = new Sns(this, "Monitoring", {
      notifyEmail: stackConfiguration.monitoring.email,
    });

    const monitoring = new MonitoringCloudwatchLogs(this, "MonitoringLogs", {
      appEnv: props.appEnv,
      vpc: props.vpc,
      logGroup: props.infraLogGroup,
      ecsLogGroup: props.ecsLogGroup,
      alarmTopic: sns.alarmTopic,
      slackAlertTopic: props.slackAlertTopic,
      slackInfoTopic: props.slackInfoTopic,
    });

    const alb = new Alb(this, "Alb", {
      vpc: props.vpc,
      hostedZone: props.hostedZone,
      certificate: props.certificate,
      alarmTopic: sns.alarmTopic,
      albSg: stackConfiguration.albSg[props.appEnv],
      albDomain: stackConfiguration.albDomain[props.appEnv],
      enableWaf: false,
    });

    const releaseTagApiKey = `/${CODE_NAME}/${props.appEnv}/release-tag/api`;
    const releaseTagApi = aws_ssm.StringParameter.valueForStringParameter(
      this,
      releaseTagApiKey,
    );
    const releaseTagWebNginxKey = `/${CODE_NAME}/${props.appEnv}/release-tag/web-nginx`;
    const releaseTagWebNginx = aws_ssm.StringParameter.valueForStringParameter(
      this,
      releaseTagWebNginxKey,
    );
    const releaseTagWebKey = `/${CODE_NAME}/${props.appEnv}/release-tag/web`;
    const releaseTagWeb = aws_ssm.StringParameter.valueForStringParameter(
      this,
      releaseTagWebKey,
    );

    const adminSecret = new aws_secretsmanager.Secret(this, `AdminSecret`, {
      description: `Admin secret for ${props.appEnv}`,
      generateSecretString: {
        passwordLength: 64,
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "secret_token",
        // Next は .env に $ や \ が入っているとエスケープなしでパース出来ないため、最初から除外する
        excludeCharacters: `$\\`,
      },
    });

    const cookieSecret = new aws_secretsmanager.Secret(this, `CookieSecret`, {
      description: `Cookie secret for ${props.appEnv}`,
      generateSecretString: {
        passwordLength: 64,
        secretStringTemplate: JSON.stringify({
          name: stackConfiguration.session.name,
          max_age: stackConfiguration.session.maxAge.toString(),
        }),
        generateStringKey: "password",
        // Next は .env に $ や \ が入っているとエスケープなしでパース出来ないため、最初から除外する
        // https://github.com/vercel/next.js/discussions/35818#discussioncomment-2486087
        excludeCharacters: `$\\`,
      },
    });

    const sessionSecret = new aws_secretsmanager.Secret(this, `SessionSecret`, {
      description: `Session secret for ${props.appEnv}`,
      generateSecretString: {
        passwordLength: 64,
        secretStringTemplate: JSON.stringify({
          jwt_issuer: stackConfiguration.jwt.issuer,
          jwt_audience: stackConfiguration.jwt.audience,
        }),
        generateStringKey: "jwt_secret",
        // Next は .env に $ や \ が入っているとエスケープなしでパース出来ないため、最初から除外する
        // https://github.com/vercel/next.js/discussions/35818#discussioncomment-2486087
        excludeCharacters: `$\\`,
      },
    });

    const adminSessionSecret = new aws_secretsmanager.Secret(
      this,
      `AdminSessionSecret`,
      {
        description: `Session secret for ${props.appEnv}`,
        generateSecretString: {
          passwordLength: 64,
          secretStringTemplate: JSON.stringify({
            jwt_issuer: stackConfiguration.jwt.issuer,
            jwt_audience: stackConfiguration.jwt.audience,
          }),
          generateStringKey: "jwt_secret",
          // Next は .env に $ や \ が入っているとエスケープなしでパース出来ないため、最初から除外する
          // https://github.com/vercel/next.js/discussions/35818#discussioncomment-2486087
          excludeCharacters: `$\\`,
        },
      },
    );

    const adminPasswordSecret = new aws_secretsmanager.Secret(
      this,
      `AdminPasswordSecret`,
      {
        description: `Admin password secret for ${props.appEnv}`,
        generateSecretString: {
          passwordLength: 64,
          secretStringTemplate: JSON.stringify({
            email: "d@opt.ne.jp",
          }),
          generateStringKey: "password",
        },
      },
    );

    const adminPepperSecret = new aws_secretsmanager.Secret(
      this,
      `AdminPepperSecret`,
      {
        description: `Admin pepper secret for ${props.appEnv}`,
        generateSecretString: {
          passwordLength: 64,
          secretStringTemplate: JSON.stringify({}),
          generateStringKey: "pepper",
        },
      },
    );

    const fargateApi = new Fargate(this, "FargateApi", {
      logGroup: props.ecsLogGroup,
      logPrefix: "api",
      vpc: props.vpc,
      rds: props.rds,
      ecrRepositoryApp: props.ecr.apiAppRepository,
      alb,
      releaseTag: releaseTagApi,
      containerPort: 4000,
      hostHeader: alb.apiDomain,
      spec: stackConfiguration.fargate[props.appEnv].api,
      secrets: {
        ...ecsRdsSecrets(props.rds),
        SESSION_JWT_ISSUER: aws_ecs.Secret.fromSecretsManager(
          sessionSecret,
          "jwt_issuer",
        ),
        SESSION_JWT_AUDIENCE: aws_ecs.Secret.fromSecretsManager(
          sessionSecret,
          "jwt_audience",
        ),
        SESSION_JWT_SECRET: aws_ecs.Secret.fromSecretsManager(
          sessionSecret,
          "jwt_secret",
        ),
        ADMIN_SESSION_JWT_ISSUER: aws_ecs.Secret.fromSecretsManager(
          adminSessionSecret,
          "jwt_issuer",
        ),
        ADMIN_SESSION_JWT_AUDIENCE: aws_ecs.Secret.fromSecretsManager(
          adminSessionSecret,
          "jwt_audience",
        ),
        ADMIN_SESSION_JWT_SECRET: aws_ecs.Secret.fromSecretsManager(
          adminSessionSecret,
          "jwt_secret",
        ),
        ADMIN_SECRET_TOKEN: aws_ecs.Secret.fromSecretsManager(
          adminSecret,
          "secret_token",
        ),
        WEBHOOK_TOKEN: aws_ecs.Secret.fromSecretsManager(
          adminSecret,
          "secret_token",
        ),
        INITIAL_ADMINISTRATOR_EMAIL: aws_ecs.Secret.fromSecretsManager(
          adminPasswordSecret,
          "email",
        ),
        INITIAL_ADMINISTRATOR_PASSWORD: aws_ecs.Secret.fromSecretsManager(
          adminPasswordSecret,
          "password",
        ),
        ADMIN_LOGIN_CREDENTIAL_PEPPER: aws_ecs.Secret.fromSecretsManager(
          adminPepperSecret,
          "pepper",
        ),
        ADMIN_INVITATION_PEPPER: aws_ecs.Secret.fromSecretsManager(
          adminPepperSecret,
          "pepper",
        ),
      },
      environments: {
        APP_ENV: props.appEnv,
        MYSQL_DATABASE: props.rds.database,
        CORS_ORIGINS: [
          `https://${alb.webDomain}`,
          `https://${alb.webDomainWww}`,
        ].join(","),
        S3_PUBLIC_BUCKET: props.s3.publicBucket.bucketName,
        S3_PUBLIC_BUCKET_BASE_URL: `https://${props.s3.publicBucketDomainName}`,
        SES_FROM: `no-reply@${props.hostedZone.zoneName}`,
      },
      autoscaler: stackConfiguration.autoscaler[props.appEnv],
      peakTimes: props.appEnv === "prd" ? stackConfiguration.peakTimes : [],
      alarmTopic: sns.alarmTopic,
    });

    fargateApi.service.enableServiceConnect({
      services: [
        {
          portMappingName: "app",
          port: 4000,
          discoveryName: "api-app",
        },
      ],
      logDriver: aws_ecs.LogDriver.awsLogs({
        streamPrefix: "api/traffic",
        logGroup: props.ecsLogGroup,
      }),
    });

    const nextPublicEnv = {
      NEXT_PUBLIC_APP_ENV: props.appEnv,
      NEXT_PUBLIC_BASE_URL: `https://${alb.primaryWebDomain}`,
      NEXT_PUBLIC_CONNECT_BASE_URL: `https://${alb.apiDomain}`,
      NEXT_PUBLIC_LIFF_ID: stackConfiguration.line.liffId[props.appEnv],
      NEXT_PUBLIC_LIFF_URL: `https://miniapp.line.me/${
        stackConfiguration.line.liffId[props.appEnv]
      }`,
    };

    const fargateWeb = new Fargate(this, "FargateWeb", {
      logGroup: props.ecsLogGroup,
      logPrefix: "web",
      vpc: props.vpc,
      rds: props.rds,
      ecrRepositoryApp: props.ecr.webAppRepository,
      alb,
      releaseTag: releaseTagWeb,
      containerPort: 4001,
      spec: stackConfiguration.fargate[props.appEnv].web,
      secrets: {
        COOKIE_NAME: aws_ecs.Secret.fromSecretsManager(cookieSecret, "name"),
        COOKIE_MAX_AGE: aws_ecs.Secret.fromSecretsManager(
          cookieSecret,
          "max_age",
        ),
        COOKIE_PASSWORD: aws_ecs.Secret.fromSecretsManager(
          cookieSecret,
          "password",
        ),
      },
      environments: {
        // https://github.com/vercel/next.js/pull/36909/files
        NEXT_MANUAL_SIG_HANDLE: "1",
        PORT: "4001",
        ...nextPublicEnv,
        CONNECT_BASE_URL: `http://api-app.${props.vpc.mainEcsNamepace.namespaceName}:4000`,
      },
      nginx: {
        ecrRepository: props.ecr.webNginxRepository,
        releaseTag: releaseTagWebNginx,
      },
      autoscaler: stackConfiguration.autoscaler[props.appEnv],
      peakTimes: props.appEnv === "prd" ? stackConfiguration.peakTimes : [],
      alarmTopic: sns.alarmTopic,
    });

    fargateWeb.service.enableServiceConnect({
      logDriver: aws_ecs.LogDriver.awsLogs({
        streamPrefix: "web/traffic",
        logGroup: props.ecsLogGroup,
      }),
    });

    fargateApi.service.connections.allowFrom(
      fargateWeb.service,
      aws_ec2.Port.tcp(4000),
    );

    fargateWeb.service.node.addDependency(fargateApi.service);

    props.s3.publicBucket.grantReadWrite(
      fargateApi.service.taskDefinition.taskRole,
    );

    const domainIdentity = new aws_ses.EmailIdentity(
      this,
      "SenderDomainIdentity",
      {
        identity: aws_ses.Identity.publicHostedZone(props.hostedZone),
        mailFromDomain: `mail.${props.hostedZone.zoneName}`,
      },
    );
    new aws_route53.TxtRecord(this, "DMARCTxtRecord", {
      zone: props.hostedZone,
      recordName: "_dmarc",
      values: ["v=DMARC1; p=reject;"],
    });
    fargateApi.service.taskDefinition.taskRole.addToPrincipalPolicy(
      new aws_iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
        effect: aws_iam.Effect.ALLOW,
      }),
    );

    new Pipeline(this, "Pipeline", {
      logGroup: props.infraLogGroup,
      vpc: props.vpc,
      dockerHub: props.dockerHub,
      rds: props.rds,
      ecr: props.ecr,
      fargateApi,
      fargateWeb,
      fargateWebNextPublicEnvironments: {
        ...Object.entries(nextPublicEnv).reduce((acc, [k, v]) => {
          return {
            ...acc,
            [k]: {
              type: aws_codebuild.BuildEnvironmentVariableType.PLAINTEXT,
              value: v,
            },
          };
        }, {}),
      },
      releaseTagWebNginxKey,
      releaseTagWebKey,
      releaseTagApiKey,
      github: {
        codeStarConnectionArn: stackConfiguration.github.codestarConnectionArn,
        owner: stackConfiguration.github.owner,
        repo: stackConfiguration.github.repo,
        branch: stackConfiguration.github.branch[props.appEnv],
      },
    });

    new CloudWatchDashboard(this, "CloudWatchDashboard", {
      env: props.appEnv,
      rds: props.rds,
      alb,
      fargateWeb,
      fargateApi,
    });
  }
}
