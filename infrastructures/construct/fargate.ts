import {
  Annotations,
  Duration,
  aws_applicationautoscaling,
  aws_cloudwatch_actions,
  aws_ec2,
  aws_ecr,
  aws_ecs,
  aws_events,
  aws_events_targets,
  aws_logs,
  aws_sns,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Rds } from "./rds";
import { Vpc } from "./vpc";
import { Alb } from "./alb";
import { ComparisonOperator, Stats } from "aws-cdk-lib/aws-cloudwatch";

type FargateProps = {
  memoryLimitMiB: number;
  cpu: number;
  desiredCount: number;
};

type Props = {
  logGroup: aws_logs.ILogGroup;
  logPrefix: string;
  vpc: Vpc;
  rds: Rds;
  alb: Alb;
  releaseTag: string;
  ecrRepositoryApp: aws_ecr.IRepository;
  containerPort: number;
  hostHeader?: string;
  healthPath?: string;
  spec: FargateProps;
  environments?: {
    [key: string]: string;
  };
  secrets?: {
    [key: string]: aws_ecs.Secret;
  };
  nginx?: {
    ecrRepository: aws_ecr.IRepository;
    releaseTag: string;
  };
  autoscaler: number;
  peakTimes: {
    id: string;
    start: { y: number; m: number; d: number; h: number; mi: number };
    end: { y: number; m: number; d: number; h: number; mi: number };
  }[];
  alarmTopic: aws_sns.ITopic;
};

export class Fargate extends Construct {
  service: aws_ecs.FargateService;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const taskDefinition = new aws_ecs.FargateTaskDefinition(this, "TaskDef", {
      memoryLimitMiB: props.spec.memoryLimitMiB,
      cpu: props.spec.cpu,
    });

    const containerApp = taskDefinition.addContainer("ContainerApp", {
      containerName: "app",
      essential: true,
      image: aws_ecs.ContainerImage.fromEcrRepository(
        props.ecrRepositoryApp,
        props.releaseTag
      ),
      logging: aws_ecs.LogDriver.awsLogs({
        streamPrefix: props.logPrefix,
        logGroup: props.logGroup,
      }),
      // NOTE: distroless には curl が入っていないので busybox の wget を使う
      healthCheck: {
        command: [
          "CMD",
          "wget",
          "--no-verbose",
          "--tries=1",
          "--spider",
          `http://localhost:${props.containerPort}/health`,
        ],
        interval: Duration.seconds(5),
        timeout: Duration.seconds(3),
        retries: 10,
      },
      environment: props.environments,
      secrets: props.secrets,
      stopTimeout: Duration.seconds(2),
    });

    const sg = new aws_ec2.SecurityGroup(this, "Sg", {
      vpc: props.vpc.main,
      allowAllOutbound: true,
    });

    this.service = new aws_ecs.FargateService(this, "Service", {
      cluster: props.vpc.mainEcsCluster,
      vpcSubnets: props.vpc.main.selectSubnets({
        subnetGroupName: "PrivateWithEgress",
      }),
      securityGroups: [sg],
      taskDefinition,
      desiredCount: props.spec.desiredCount,
      maxHealthyPercent: 400,
      minHealthyPercent: 100,
      enableExecuteCommand: true,
    });

    sg.connections.allowTo(
      props.rds.cluster,
      aws_ec2.Port.tcp(3306),
      "App can call Database"
    );
    Annotations.of(sg).acknowledgeWarning(
      "@aws-cdk/aws-ec2:ipv4IgnoreEgressRule",
      "sg.connections.allowFrom でＲＤＳのインバウンド通信側のみ許可設定すべきだが fargate.ts と rds.ts 間で循環参照するため仕方なくこの方法で、かつ警告を抑制"
    );

    const autoscaling = this.service.autoScaleTaskCount({
      minCapacity: props.spec.desiredCount,
      maxCapacity: props.spec.desiredCount * props.autoscaler,
    });
    autoscaling.scaleOnCpuUtilization("ScaleOnCpuUtilization60", {
      targetUtilizationPercent: 60,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(600),
    });
    props.peakTimes.forEach((peakTime) => {
      autoscaling.scaleOnSchedule(peakTime.id + "Start", {
        schedule: aws_applicationautoscaling.Schedule.cron({
          year: String(peakTime.start.y),
          month: String(peakTime.start.m),
          day: String(peakTime.start.d),
          hour: String(peakTime.start.h),
          minute: String(peakTime.start.mi),
        }),
        minCapacity: props.spec.desiredCount * props.autoscaler,
        maxCapacity: props.spec.desiredCount * props.autoscaler * 2,
      });
      autoscaling.scaleOnSchedule(peakTime.id + "End", {
        schedule: aws_applicationautoscaling.Schedule.cron({
          year: String(peakTime.end.y),
          month: String(peakTime.end.m),
          day: String(peakTime.end.d),
          hour: String(peakTime.end.h),
          minute: String(peakTime.end.mi),
        }),
        minCapacity: props.spec.desiredCount,
        maxCapacity: props.spec.desiredCount * props.autoscaler,
      });
    });

    if (props.nginx) {
      const containerNginx = taskDefinition.addContainer("ContainerNginx", {
        containerName: "nginx",
        essential: true,
        image: aws_ecs.ContainerImage.fromEcrRepository(
          props.nginx.ecrRepository,
          props.nginx.releaseTag
        ),
        logging: aws_ecs.LogDriver.awsLogs({
          streamPrefix: props.logPrefix,
          logGroup: props.logGroup,
        }),
        healthCheck: {
          command: ["CMD-SHELL", "curl -f http://localhost/health || exit 1"],
          interval: Duration.seconds(5),
          timeout: Duration.seconds(3),
          retries: 10,
        },
        stopTimeout: Duration.seconds(2),
      });
      containerNginx.addPortMappings({
        name: "nginx",
        containerPort: 80,
        protocol: aws_ecs.Protocol.TCP,
        appProtocol: aws_ecs.AppProtocol.http,
      });
      const tg = props.alb.addEcsTarget(id, {
        ecsService: this.service,
        containerName: "nginx",
        containerPort: 80,
        healthPath: props.healthPath,
        hostHeader: props.hostHeader,
      });

      // Alarm for ALB TargetGroup - HealthyHostCount
      tg.metrics
        .healthyHostCount({
          period: Duration.minutes(1),
          statistic: Stats.AVERAGE,
        })
        .createAlarm(this, "AlbNginxTgHealthyHostCount", {
          evaluationPeriods: 3,
          threshold: 1,
          comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
          actionsEnabled: true,
        })
        .addAlarmAction(new aws_cloudwatch_actions.SnsAction(props.alarmTopic));

      // Alarm for ALB TargetGroup - UnHealthyHostCount
      tg.metrics
        .unhealthyHostCount({
          period: Duration.minutes(1),
          statistic: Stats.AVERAGE,
        })
        .createAlarm(this, "AlbNginxTgUnHealthyHostCount", {
          evaluationPeriods: 3,
          threshold: 1,
          comparisonOperator:
            ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          actionsEnabled: true,
        })
        .addAlarmAction(new aws_cloudwatch_actions.SnsAction(props.alarmTopic));

      autoscaling.scaleOnRequestCount("ScaleOnRequestCount", {
        targetGroup: tg,
        requestsPerTarget: 500 * 60,
        scaleInCooldown: Duration.seconds(60),
        scaleOutCooldown: Duration.seconds(600),
      });
    } else {
      containerApp.addPortMappings({
        name: "app",
        containerPort: props.containerPort,
        protocol: aws_ecs.Protocol.TCP,
        appProtocol: aws_ecs.AppProtocol.http,
      });
      const tg = props.alb.addEcsTarget(id, {
        ecsService: this.service,
        containerName: "app",
        containerPort: props.containerPort,
        healthPath: props.healthPath,
        hostHeader: props.hostHeader,
      });

      // Alarm for ALB TargetGroup - HealthyHostCount
      tg.metrics
        .healthyHostCount({
          period: Duration.minutes(1),
          statistic: Stats.AVERAGE,
        })
        .createAlarm(this, "AlbAppTgHealthyHostCount", {
          evaluationPeriods: 3,
          threshold: 1,
          comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
          actionsEnabled: true,
        })
        .addAlarmAction(new aws_cloudwatch_actions.SnsAction(props.alarmTopic));

      // Alarm for ALB TargetGroup - UnHealthyHostCount
      tg.metrics
        .unhealthyHostCount({
          period: Duration.minutes(1),
          statistic: Stats.AVERAGE,
        })
        .createAlarm(this, "AlbAppTgUnHealthyHostCount", {
          evaluationPeriods: 3,
          threshold: 1,
          comparisonOperator:
            ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          actionsEnabled: true,
        })
        .addAlarmAction(new aws_cloudwatch_actions.SnsAction(props.alarmTopic));

      autoscaling.scaleOnRequestCount("ScaleOnRequestCount", {
        targetGroup: tg,
        requestsPerTarget: 500 * 60,
        scaleInCooldown: Duration.seconds(60),
        scaleOutCooldown: Duration.seconds(600),
      });
    }

    this.service
      .metricCpuUtilization({
        period: Duration.minutes(1),
        statistic: Stats.AVERAGE,
      })
      .createAlarm(this, "FargateCpuUtil", {
        evaluationPeriods: 3,
        datapointsToAlarm: 3,
        threshold: 60,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        actionsEnabled: true,
      })
      .addAlarmAction(new aws_cloudwatch_actions.SnsAction(props.alarmTopic));

    // Event notification for ECS
    // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_cwe_events.html#ecs_service_events
    new aws_events.Rule(this, "ECSServiceActionEventRule", {
      description:
        "CloudWatch Event Rule to send notification on ECS Service action events.",
      enabled: true,
      eventPattern: {
        source: ["aws.ecs"],
        detailType: ["ECS Service Action"],
        detail: {
          eventType: ["WARN", "ERROR"],
        },
      },
      targets: [new aws_events_targets.SnsTopic(props.alarmTopic)],
    });

    // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_cwe_events.html#ecs_service_deployment_events
    new aws_events.Rule(this, "ECSServiceDeploymentEventRule", {
      description:
        "CloudWatch Event Rule to send notification on ECS Service deployment events.",
      enabled: true,
      eventPattern: {
        source: ["aws.ecs"],
        detailType: ["ECS Deployment State Change"],
        detail: {
          eventType: ["WARN", "ERROR"],
        },
      },
      targets: [new aws_events_targets.SnsTopic(props.alarmTopic)],
    });
  }
}
