import * as cdk from '@aws-cdk/core';
import * as rds from '@aws-cdk/aws-rds';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import * as iam from '@aws-cdk/aws-iam';
import * as ec2 from '@aws-cdk/aws-ec2';
require('dotenv').config()

export class RdsProxyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Assuming an existing VPC
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'VPC', {
      vpcId: process.env.VPC_ID!, 
      availabilityZones: [process.env.AVAILABILITY_ZONES!],
      isolatedSubnetIds: String(process.env.PRIVATE_SUBNET_IDS!).split(',')
    });

    // Create a new security group
    const securityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
      vpc: vpc,
      description: 'Security group for RDS DB instance',
      allowAllOutbound: true,
    });

    // Assuming an existing RDS DB instance
    const dbInstanceIdentifier = process.env.DB_IDENTIFIER!;
    const dbInstance = rds.DatabaseInstance.fromDatabaseInstanceAttributes(this, 'paymentsDBInstance', {
      instanceIdentifier: dbInstanceIdentifier,
      instanceEndpointAddress:  process.env.DB_ENDPOINT!,
      port: 3306,
      securityGroups: [securityGroup],
      engine: rds.DatabaseInstanceEngine.POSTGRES
    });

    // This code assumes a secret called 'payments-db-secret' already exists
    // It is a good practice since we don't want to expose credentials in a cloudformation template
    const dbSecret = secretsmanager.Secret.fromSecretNameV2(this, 'DBSecret', 'payments-db-secret');

    // IAM role for RDS Proxy
    const proxyRole = new iam.Role(this, 'ProxyRole', {
      assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
    });

    // Grant necessary permissions to the role
    proxyRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'secretsmanager:GetRandomPassword',
        'secretsmanager:CreateSecret',
        'secretsmanager:ListSecrets',
        'secretsmanager:*',
      ],
      resources: ['*'],
    }));

    // RDS Proxy
    const proxy = new rds.DatabaseProxy(this, 'Proxy', {
      vpc: vpc,
      secrets: [dbSecret],
      dbProxyName: 'payments-rds-proxy',
      role: proxyRole,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      proxyTarget: rds.ProxyTarget.fromInstance(dbInstance),
      requireTLS: false,
      //idleClientTimeout: cdk.Duration.minutes(30),
      debugLogging: false,
    });
  }
}


