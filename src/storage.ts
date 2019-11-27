import { DynamoDB } from "aws-sdk";
import { DataMapper } from "@aws/dynamodb-data-mapper";
import { attribute, hashKey, table} from "@aws/dynamodb-data-mapper-annotations";
export const thirukurralTableName: string = process.env['THIRUKKURAL_TABLE_NAME'] || '';
const mapper = new DataMapper({ client: new DynamoDB() });
const dynamoDb = new DynamoDB.DocumentClient();

export async function createKurral( kurral: ThirukkuralEvaluation[]) {
 const start = new Date().getTime();
 try {
   if (await readAndDeleteKurral(kurral)) {
    for await (const persisted of mapper.batchPut(kurral)) {
     console.log(`event_type="API", action="KURRAL_CREATE",status="Success", promo_key="${persisted.id}",duration_millis="${new Date().getTime() - start}"`);
    }
    return success('{"kurallCreation": "success"}');
   } else {
     return error(400, "Internal Server Error.");
   }
 } catch (exception) {
     console.error(`Error creating/updating promo data to dynamodb - ${exception}`);
     console.log(`event_type="API", action="TIER_PROMO_CREATE",status="Failed", duration_millis="${new Date().getTime() - start}"`);
     throw exception;
 }
}

export async function readAndDeleteKurral(thirukkuralEvaluation: ThirukkuralEvaluation[]) {
 const start = new Date().getTime();
 let allTierQry = getAllKurral(thirukkuralEvaluation[0].id || '');
 let thrikurralList: ThirukkuralEvaluation[] = [];
 try {
     let kurralResults = await dynamoDb.query(allTierQry).promise();

     if (kurralResults && kurralResults.Items && kurralResults.Items.length) {
         kurralResults.Items.forEach((kurralItem: any) => {
           thrikurralList.push(populateThirukkuralEvaluationnModel(kurralItem));
         });
     }
     if (thrikurralList && thrikurralList.length) {
         for await (const persisted of mapper.batchDelete(thrikurralList)) {
             console.log(`event_type="API", action="THIRUKURRAL_DELETE",status="Success", kural_id="${persisted.id}",duration_millis="${new Date().getTime() - start}"`);
         }
     }
     return true;
 } catch (exception) {
     console.error(`Error deleting promo data in dynamodb - ${exception}`);
     console.log(`event_type="API", action="THIRUKURRAL_DELETE",status="Failed", duration_millis="${new Date().getTime() - start}"`);
     return false;
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

@table(thirukurralTableName)
export class ThirukkuralEvaluation {
 @hashKey()
 id: string | undefined;
 @attribute()
 line1: string | undefined;
 @attribute()
 line2: string | undefined;
 @attribute()
 translation: string | undefined;
 @attribute()
 explanation: string | undefined;
}

export function populateThirukkuralEvaluationnModel(kurralJson: any) {
 let kurral = new ThirukkuralEvaluation();
 kurral.id = kurralJson.id;
 kurral.line1 = kurralJson.line1;
 kurral.line2 = kurralJson.line2;
 kurral.translation = kurralJson.translation;
 kurral.explanation = kurralJson.explanation;
 return kurral;
}

export async function success(payload: any) {
 return {
     statusCode: 200,
     headers: {
         'Content-Type': 'application/json'
     },
     body: payload
 };
}

export async function error(statusCode: number, errorText: string) {
 return {
     statusCode,
     body: errorText
 };
}