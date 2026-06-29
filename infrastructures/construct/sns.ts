import { aws_iam, aws_sns, PhysicalName } from "aws-cdk-lib";
import { Construct } from "constructs";

type Props = {
  notifyEmail: string[];
};

export class Sns extends Construct {
  public readonly alarmTopic: aws_sns.ITopic;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    this.alarmTopic = new aws_sns.Topic(this, "AlarmTopic", {
      topicName: PhysicalName.GENERATE_IF_NEEDED, // for crossRegionReference
    });

    props.notifyEmail.forEach((email, index) => {
      new aws_sns.Subscription(this, `EmailSubsc${index}`, {
        endpoint: email,
        protocol: aws_sns.SubscriptionProtocol.EMAIL,
        topic: this.alarmTopic,
      });
    });

    this.alarmTopic.addToResourcePolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        principals: [new aws_iam.ServicePrincipal("cloudwatch.amazonaws.com")],
        actions: ["sns:Publish"],
        resources: [this.alarmTopic.topicArn],
      })
    );
  }
}
