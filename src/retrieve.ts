import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { success, ThirukkuralEvaluation, populateThirukkuralEvaluationnModel } from './storage';

export const thirukurralTableName: string = process.env['THIRUKKURAL_TABLE_NAME'] || '';
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function getKurralJSON(kurralId: number) {
    // Always convert id to string for DynamoDB queries
    
    let kurral: ThirukkuralEvaluation = await getKurralByID(kurralId);
    if (kurral) {
        return success(JSON.stringify(kurral));
    }
    console.error('No Kurral By ID Data found');
    return success('{}');
}

async function getKurralByID(id: number) {
 let kurral: ThirukkuralEvaluation;
 // Always convert id to string for DynamoDB queries
 let getKurralQuery = getAllKurral(id);
 try {
  let kurralResults = await dynamoDb.send(getKurralQuery);
  let kurralItem = kurralResults && kurralResults.Items && kurralResults.Items[0];
  if (kurralItem) {
   kurral = populateThirukkuralEvaluationnModel(kurralItem);
  }
  return kurral;
 } catch (exception) {
  console.error(`Error fetching kurral from dynamodb - ${exception}`);
  return kurral;
 }
}

function getAllKurral(id: number) {
    return new QueryCommand({
        TableName: thirukurralTableName,
        KeyConditionExpression: "#id = :id",
        ExpressionAttributeNames: {
            "#id": "id"
        },
        ExpressionAttributeValues: {
            ":id": id,
        }
    });
}

class KurralInfo {
 id: string;
}