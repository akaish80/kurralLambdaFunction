import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
export const thirukurralTableName: string = process.env['THIRUKKURAL_TABLE_NAME'] || '';
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function createKurral(kurral: ThirukkuralEvaluation[]) {
    const start = new Date().getTime();
    try {
        if (await readAndDeleteKurral(kurral)) {
            // Batch write items to DynamoDB
            const putRequests = kurral.map(item => ({ PutRequest: { Item: item } }));
            const params = {
                RequestItems: {
                    [thirukurralTableName]: putRequests
                }
            };
            await dynamoDb.send(new BatchWriteCommand(params));
            console.log(`event_type="API", action="KURRAL_CREATE",status="Success", duration_millis="${new Date().getTime() - start}"`);
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
        let kurralResults = await dynamoDb.send(allTierQry);
        if (kurralResults && kurralResults.Items && kurralResults.Items.length) {
            thrikurralList = kurralResults.Items.map((kurralItem: any) => populateThirukkuralEvaluationnModel(kurralItem));
        }
        if (thrikurralList && thrikurralList.length) {
            // Batch delete items from DynamoDB
            const deleteRequests = thrikurralList.map(item => ({ DeleteRequest: { Key: { id: item.id } } }));
            const params = {
                RequestItems: {
                    [thirukurralTableName]: deleteRequests
                }
            };
            await dynamoDb.send(new BatchWriteCommand(params));
            thrikurralList.forEach(item => {
                console.log(`event_type="API", action="THIRUKURRAL_DELETE",status="Success", kural_id="${item.id}",duration_millis="${new Date().getTime() - start}"`);
            });
        }
        return true;
    } catch (exception) {
        console.error(`Error deleting promo data in dynamodb - ${exception}`);
        console.log(`event_type="API", action="THIRUKURRAL_DELETE",status="Failed", duration_millis="${new Date().getTime() - start}"`);
        return false;
    }
}

function getAllKurral(id: string) {
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


export class ThirukkuralEvaluation {
    id: string | undefined;
    line1: string | undefined;
    line2: string | undefined;
    translation: string | undefined;
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