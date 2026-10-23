/**
 * RepoPulse AI - AWS CDK v2 Cloud Infrastructure Stack
 * Deploys Serverless GitHub Webhook Receiver, DynamoDB Audit Cache & Bedrock IAM Roles.
 * Amazon Developer Hackathon Edition
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

// Simulated / standalone CDK definitions for clean compilation without heavy npm install
export interface StackProps {
  env?: {
    account?: string;
    region?: string;
  };
}

export class RepoPulseCdkStack {
  public readonly stackName = 'RepoPulseAiStack';
  public readonly region: string;

  constructor(scope: any, id: string, props: StackProps = {}) {
    this.region = props.env?.region || process.env.CDK_DEFAULT_REGION || 'us-east-1';
  }

  /**
   * Generates AWS CloudFormation template representation of RepoPulse infrastructure.
   */
  public toCloudFormationTemplate(): Record<string, any> {
    return {
      AWSTemplateFormatVersion: '2010-09-09',
      Description: 'RepoPulse AI Serverless Maintainer Harness & Bedrock Nova Engine Stack',
      Parameters: {
        GitHubWebhookSecret: {
          Type: 'String',
          NoEcho: true,
          Description: 'HMAC SHA-256 secret for validating incoming GitHub webhook payloads.'
        }
      },
      Resources: {
        // 1. DynamoDB Review & Telemetry Table
        RepoPulseReviewsTable: {
          Type: 'AWS::DynamoDB::Table',
          Properties: {
            TableName: 'RepoPulseReviews',
            BillingMode: 'PAY_PER_REQUEST',
            PointInTimeRecoverySpecification: {
              PointInTimeRecoveryEnabled: true
            },
            SSESpecification: {
              SSEEnabled: true
            },
            AttributeDefinitions: [
              { AttributeName: 'repo', AttributeType: 'S' },
              { AttributeName: 'prNumber', AttributeType: 'N' }
            ],
            KeySchema: [
              { AttributeName: 'repo', KeyType: 'HASH' },
              { AttributeName: 'prNumber', KeyType: 'RANGE' }
            ]
          }
        },

        // 2. IAM Role for Lambda with Bedrock Converse & Guardrails Permissions
        RepoPulseLambdaRole: {
          Type: 'AWS::IAM::Role',
          Properties: {
            AssumeRolePolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: { Service: 'lambda.amazonaws.com' },
                  Action: 'sts:AssumeRole'
                }
              ]
            },
            ManagedPolicyArns: [
              'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
            ],
            Policies: [
              {
                PolicyName: 'RepoPulseBedrockAccess',
                PolicyDocument: {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Effect: 'Allow',
                      Action: [
                        'bedrock:InvokeModel',
                        'bedrock:InvokeModelWithResponseStream',
                        'bedrock:ApplyGuardrail'
                      ],
                      Resource: [
                        'arn:aws:bedrock:*::foundation-model/amazon.nova-*',
                        'arn:aws:bedrock:*::foundation-model/anthropic.claude-*',
                        'arn:aws:bedrock:*:*:guardrail/*'
                      ]
                    },
                    {
                      Effect: 'Allow',
                      Action: [
                        'dynamodb:PutItem',
                        'dynamodb:GetItem',
                        'dynamodb:UpdateItem',
                        'dynamodb:Query'
                      ],
                      Resource: { 'Fn::GetAtt': ['RepoPulseReviewsTable', 'Arn'] }
                    }
                  ]
                }
              }
            ]
          }
        },

        // 3. AWS Lambda Function
        RepoPulseWorkerFunction: {
          Type: 'AWS::Lambda::Function',
          Properties: {
            FunctionName: 'RepoPulseReviewWorker',
            Runtime: 'nodejs20.x',
            Handler: 'dist/infra/lambda/webhook-handler.handler',
            MemorySize: 1024,
            Timeout: 60,
            Role: { 'Fn::GetAtt': ['RepoPulseLambdaRole', 'Arn'] },
            Environment: {
              Variables: {
                AWS_REGION: this.region,
                REVIEWS_TABLE_NAME: { Ref: 'RepoPulseReviewsTable' }
              }
            }
          }
        },

        // 4. Amazon API Gateway HTTP API
        RepoPulseHttpApi: {
          Type: 'AWS::ApiGatewayV2::Api',
          Properties: {
            Name: 'RepoPulseWebhookApi',
            ProtocolType: 'HTTP',
            Description: 'Public webhook endpoint receiving GitHub pull request events.'
          }
        },

        // 5. API Gateway Integration with Lambda
        RepoPulseApiIntegration: {
          Type: 'AWS::ApiGatewayV2::Integration',
          Properties: {
            ApiId: { Ref: 'RepoPulseHttpApi' },
            IntegrationType: 'AWS_PROXY',
            IntegrationUri: { 'Fn::GetAtt': ['RepoPulseWorkerFunction', 'Arn'] },
            PayloadFormatVersion: '2.0'
          }
        },

        // 6. API Gateway Route (POST /webhook)
        RepoPulseWebhookRoute: {
          Type: 'AWS::ApiGatewayV2::Route',
          Properties: {
            ApiId: { Ref: 'RepoPulseHttpApi' },
            RouteKey: 'POST /webhook',
            Target: { 'Fn::Join': ['/', ['integrations', { Ref: 'RepoPulseApiIntegration' }]] }
          }
        },

        // 7. Lambda Permission for API Gateway
        RepoPulseLambdaPermission: {
          Type: 'AWS::Lambda::Permission',
          Properties: {
            Action: 'lambda:InvokeFunction',
            FunctionName: { Ref: 'RepoPulseWorkerFunction' },
            Principal: 'apigateway.amazonaws.com',
            SourceArn: {
              'Fn::Sub': 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${RepoPulseHttpApi}/*/*/webhook'
            }
          }
        }
      },
      Outputs: {
        WebhookUrl: {
          Description: 'Add this URL to your GitHub repository Webhook settings.',
          Value: {
            'Fn::Sub': 'https://${RepoPulseHttpApi}.execute-api.${AWS::Region}.amazonaws.com/webhook'
          }
        },
        ReviewsTableArn: {
          Description: 'DynamoDB table storing PR reviews and AST metrics.',
          Value: { 'Fn::GetAtt': ['RepoPulseReviewsTable', 'Arn'] }
        }
      }
    };
  }
}
