import {
  Handler,
  CloudWatchLogsEvent,
  CloudWatchLogsDecodedData
} from "aws-lambda";
import * as zlib from "zlib";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const APPENV          = process.env.APPENV;
const CODE_NAME       = process.env.CODE_NAME;
const INFO_TOPIC_ARN  = process.env.INFO_TOPIC_ARN;
const ALERT_TOPIC_ARN = process.env.ALERT_TOPIC_ARN;

const snsClient       = new SNSClient({});
const checkKeywords   = [
  { keyword: "[通知][開始]",   suffix: ":arrow_forward: 開始",      topicArn: INFO_TOPIC_ARN,  sentinel: false },
  { keyword: "[通知][終了]",   suffix: ":white_check_mark: 完了",   topicArn: INFO_TOPIC_ARN,  sentinel: false },
  { keyword: "[通知][エラー]", suffix: ":warning: 警告",            topicArn: ALERT_TOPIC_ARN, sentinel: false },
  { keyword: "[通知]",         suffix: ":information_source: 情報", topicArn: INFO_TOPIC_ARN,  sentinel: true  }, //番兵：必ず最後に設置
];

export const handler: Handler<CloudWatchLogsEvent> = async (event) => {
  const payload = Buffer.from(event.awslogs.data, "base64");

  try {
    const result = zlib.gunzipSync(payload);
    const logData: CloudWatchLogsDecodedData = JSON.parse(result.toString("utf-8"));

    console.log("Decoded data:", JSON.stringify(logData, null, 2));

    if (logData.messageType !== "DATA_MESSAGE" || !Array.isArray(logData.logEvents)) {
      return true;
    }

    const logGroup   = encodeURIComponent(encodeURIComponent(logData.logGroup));  // double encode
    const logStream  = encodeURIComponent(encodeURIComponent(logData.logStream)); // double encode
    const startTime  = new Date(logData.logEvents[0].timestamp).toISOString();
    const refEventId = logData.logEvents[0].id;

    const messages = logData.logEvents.map((e) => {
      const date = new Intl.DateTimeFormat("ja-JP", {
        year: "numeric", month:  "2-digit", day:    "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        timeZone: "Asia/Tokyo"
      }).format(new Date(e.timestamp));
      return `${date}: ${e.message}`;
    }).join("\n");

    let topicArn = INFO_TOPIC_ARN;
    const titleSuffixes: string[] = [];
    for (const check_keyword of checkKeywords) {
      if (messages.includes(check_keyword.keyword)) {
        if (check_keyword.sentinel && titleSuffixes.length > 0) {
          continue;
        }
        if (check_keyword.topicArn !== INFO_TOPIC_ARN) {
          topicArn = check_keyword.topicArn;
        }
        titleSuffixes.push(check_keyword.suffix);
      }
    }

    const messageBody = {
      version: "1.0",
      source: "custom",
      content: {
        title: `:aws_batch:${CODE_NAME}-${APPENV} ${titleSuffixes.join(" ")}`,
        description: `\`\`\`
${messages}
\`\`\`
詳細は<https://console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#logsV2:log-groups/log-group/${logGroup}/log-events/${logStream}?start=${startTime}&refEventId=${refEventId}|ログコンソール>を参照ください。
`,
      }
    };

    await snsClient.send(new PublishCommand({
      TopicArn: topicArn,
      Subject: "CloudWatch Logs Subscription Notification",
      Message: JSON.stringify(messageBody),
    }));

    console.log("Successfully published to SNS");

  } catch (error) {
    console.error("Error processing CloudWatch Logs event:", error);
    throw error;
  }
  return true;
};
