import { aws_cloudwatch, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Rds } from "./rds";
import { AppEnv } from "../lib/utils/env";
import { CODE_NAME } from "../constants";
import { Fargate } from "./fargate";
import { Alb } from "./alb";

type Props = {
  env: AppEnv;
  rds: Rds;
  alb: Alb;
  fargateWeb: Fargate;
  fargateApi: Fargate;
};

const colors = {
  orange: "#EC9455",
  blue: "#5EB1EF",
  yellow: "#D5AE39",
  red: "#EB8E90",
};

export class CloudWatchDashboard extends Construct {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const dashboard = new aws_cloudwatch.Dashboard(this, "Dashboard", {
      dashboardName: `${CODE_NAME}-${props.env}`,
    });

    dashboard.addWidgets(...this.rds({ rds: props.rds }));
    dashboard.addWidgets(...this.alb({ alb: props.alb }));
    dashboard.addWidgets(
      ...this.fargate({ web: props.fargateWeb, api: props.fargateApi })
    );
  }

  private rds(props: { rds: Rds }) {
    return [
      new aws_cloudwatch.GraphWidget({
        title: "Aurora / CPUUtilization",
        height: 6,
        width: 6,
        period: Duration.seconds(60),
        left: [
          new aws_cloudwatch.Metric({
            namespace: "AWS/RDS",
            metricName: "CPUUtilization",
            color: colors.blue,
            statistic: "max",
            unit: aws_cloudwatch.Unit.PERCENT,
            dimensionsMap: {
              Role: "READER",
              DBClusterIdentifier: props.rds.cluster.clusterIdentifier,
            },
          }),
          new aws_cloudwatch.Metric({
            namespace: "AWS/RDS",
            metricName: "CPUUtilization",
            color: colors.orange,
            statistic: "max",
            unit: aws_cloudwatch.Unit.PERCENT,
            dimensionsMap: {
              Role: "WRITER",
              DBClusterIdentifier: props.rds.cluster.clusterIdentifier,
            },
          }),
        ],
      }),
      new aws_cloudwatch.GraphWidget({
        title: "Aurora / Queries",
        height: 6,
        width: 6,
        period: Duration.seconds(60),
        left: [
          new aws_cloudwatch.Metric({
            namespace: "AWS/RDS",
            metricName: "Queries",
            color: colors.blue,
            statistic: "sum",
            dimensionsMap: {
              Role: "READER",
              DBClusterIdentifier: props.rds.cluster.clusterIdentifier,
            },
          }),
          new aws_cloudwatch.Metric({
            namespace: "AWS/RDS",
            metricName: "Queries",
            color: colors.orange,
            statistic: "sum",
            dimensionsMap: {
              Role: "WRITER",
              DBClusterIdentifier: props.rds.cluster.clusterIdentifier,
            },
          }),
        ],
      }),
    ];
  }

  private alb(props: { alb: Alb }) {
    return [
      new aws_cloudwatch.GraphWidget({
        title: "ALB / HTTPCode_Errors",
        height: 6,
        width: 6,
        period: Duration.seconds(60),
        left: [
          new aws_cloudwatch.Metric({
            namespace: "AWS/ApplicationELB",
            metricName: "HTTPCode_ELB_4XX_Count",
            statistic: "sum",
            color: colors.yellow,
            label: "4xx",
            dimensionsMap: {
              LoadBalancer: props.alb.loadBalancer.loadBalancerFullName,
            },
          }),
        ],
        right: [
          new aws_cloudwatch.Metric({
            namespace: "AWS/ApplicationELB",
            metricName: "HTTPCode_ELB_5XX_Count",
            statistic: "sum",
            color: colors.red,
            label: "5xx",
            dimensionsMap: {
              LoadBalancer: props.alb.loadBalancer.loadBalancerFullName,
            },
          }),
        ],
      }),
      new aws_cloudwatch.GraphWidget({
        title: "ALB / Latency",
        height: 6,
        width: 6,
        period: Duration.seconds(60),
        left: [
          new aws_cloudwatch.Metric({
            namespace: "AWS/ApplicationELB",
            metricName: "TargetResponseTime",
            dimensionsMap: {
              LoadBalancer: props.alb.loadBalancer.loadBalancerFullName,
            },
          }),
        ],
      }),
    ];
  }

  private fargate(props: { web: Fargate; api: Fargate }) {
    return [
      new aws_cloudwatch.GraphWidget({
        title: "Fargate / CPUUtilization",
        height: 6,
        width: 6,
        period: Duration.seconds(60),
        left: [
          new aws_cloudwatch.Metric({
            label: "web",
            namespace: "AWS/ECS",
            metricName: "CPUUtilization",
            color: colors.blue,
            statistic: "max",
            dimensionsMap: {
              ClusterName: props.web.service.cluster.clusterName,
              ServiceName: props.web.service.serviceName,
            },
          }),
          new aws_cloudwatch.Metric({
            label: "api",
            namespace: "AWS/ECS",
            metricName: "CPUUtilization",
            color: colors.orange,
            statistic: "max",
            dimensionsMap: {
              ClusterName: props.api.service.cluster.clusterName,
              ServiceName: props.api.service.serviceName,
            },
          }),
        ],
      }),
      new aws_cloudwatch.GraphWidget({
        title: "Fargate / MemoryUtilization",
        height: 6,
        width: 6,
        period: Duration.seconds(60),
        left: [
          new aws_cloudwatch.Metric({
            label: "web",
            namespace: "AWS/ECS",
            metricName: "MemoryUtilization",
            color: colors.blue,
            statistic: "max",
            dimensionsMap: {
              ClusterName: props.web.service.cluster.clusterName,
              ServiceName: props.web.service.serviceName,
            },
          }),
          new aws_cloudwatch.Metric({
            label: "api",
            namespace: "AWS/ECS",
            metricName: "MemoryUtilization",
            color: colors.orange,
            statistic: "max",
            dimensionsMap: {
              ClusterName: props.api.service.cluster.clusterName,
              ServiceName: props.api.service.serviceName,
            },
          }),
        ],
      }),
    ];
  }
}
