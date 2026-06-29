import * as AWSLambda from "aws-lambda";
import * as AWS from "aws-sdk";

const ssm = new AWS.SSM();

export async function onEventHandler(
  event: AWSLambda.CloudFormationCustomResourceEvent
) {
  switch (event.RequestType) {
    case "Create":
    case "Update":
      return putParameter(event);
    case "Delete":
      return deleteParameter(event);
  }
}

export async function putParameter(
  event: AWSLambda.CloudFormationCustomResourceEvent
) {
  for (const parameterName of event.ResourceProperties.parameterNames.split(
    ","
  )) {
    try {
      await ssm
        .getParameter({
          Name: parameterName,
        })
        .promise();
    } catch (err) {
      if (err && typeof err === "object" && "code" in err) {
        if (err.code === "ParameterNotFound") {
          await ssm
            .putParameter({
              Type: "String",
              Name: parameterName,
              Value: event.ResourceProperties.parameterValue,
            })
            .promise();
          continue;
        }
      }
      throw err;
    }
  }
  return { ParameterId: "1" };
}

export async function deleteParameter(
  event: AWSLambda.CloudFormationCustomResourceEvent
) {
  for (const parameterName of event.ResourceProperties.parameterNames.split(
    ","
  )) {
    try {
      await ssm
        .deleteParameter({
          Name: parameterName,
        })
        .promise();
    } catch (e) {
      console.log(e);
    }
  }
  return { ParameterId: "1" };
}

export async function isCompleteHandler() {
  return {
    IsComplete: true,
    Data: {
      Status: "OK",
    },
  };
}
