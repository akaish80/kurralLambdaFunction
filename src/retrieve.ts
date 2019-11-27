import { DynamoDB } from "aws-sdk";
import { success, ThirukkuralEvaluation, populateThirukkuralEvaluationnModel } from './storage';

export const thirukurralTableName: string = process.env['THIRUKKURAL_TABLE_NAME'] || '';
const dynamoDb = new DynamoDB.DocumentClient();

export async function getKurralJSON(kurralId: string) {
  let kurral: ThirukkuralEvaluation = await getKurralByID(kurralId);
  if (kurral) {
   return success(JSON.stringify(kurral));
  }
  console.error('No Kurral By ID Data found');
  return success('{}');
}

async function getKurralByID(id: string) {
 let kurral: ThirukkuralEvaluation;
 let getKurralQuery = getAllKurral(id);
 try {
  let kurralResults = await dynamoDb.query(getKurralQuery).promise();
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

function getAllKurral(id: string) {
 return {
     TableName: thirukurralTableName,
     KeyConditionExpression: "#id = :id",
     ExpressionAttributeNames: {
         "#id": "id"
     },
     ExpressionAttributeValues: {
         ":id": id,
     }
 };
}

class KurralInfo {
 id: string;
}