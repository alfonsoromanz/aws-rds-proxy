import * as cdk from '@aws-cdk/core';
import * as rds from '@aws-cdk/aws-rds';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import * as iam from '@aws-cdk/aws-iam';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as dotenv from 'dotenv';

dotenv.config();

export class RdsProxyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Assuming an existing VPC
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', { isDefault: true });

    // Create a new security group
    const securityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
      vpc: vpc,
      description: 'Security group for RDS DB instance',
      allowAllOutbound: true,
    });

    // Assuming an existing RDS DB instance
    const dbInstanceIdentifier = 'existing-db-instance-identifier';
    const dbInstance = rds.DatabaseInstance.fromDatabaseInstanceAttributes(this, 'ExistingDBInstance', {
      instanceIdentifier: dbInstanceIdentifier,
      instanceEndpointAddress: 'existing-db-instance-endpoint',
      port: 3306,
      securityGroups: [securityGroup],
    });

    // Database credentials from environment variables
    const dbUsername = process.env.DB_USERNAME || '';
    const dbPassword = process.env.DB_PASSWORD || '';

    // Create a new secret in Secrets Manager for the database credentials
    const dbSecret = new secretsmanager.Secret(this, 'DBSecret', {
      secretName: 'dbSecret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: dbUsername,
        }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 30,
      },
    });

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
      dbProxyName: 'my-proxy',
      role: proxyRole,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      proxyTarget: rds.ProxyTarget.fromInstance(dbInstance),
      requireTLS: false,
      idleClientTimeout: cdk.Duration.minutes(30),
      debugLogging: false,
    });
  }
}

// Define the CDK application
class MyCdkApp extends cdk.App {
  constructor() {
    super();
    new RdsProxyStack(this, 'RdsProxyStack');
  }
}

// Instantiate and run the CDK application
new MyCdkApp().synth();
