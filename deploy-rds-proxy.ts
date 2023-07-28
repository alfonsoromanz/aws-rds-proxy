import * as cdk from '@aws-cdk/core';
import * as rds from '@aws-cdk/aws-rds';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import * as iam from '@aws-cdk/aws-iam';

export class RdsProxyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Assuming an existing RDS DB instance
    const dbInstanceIdentifier = 'existing-db-instance-identifier';
    const dbInstance = rds.DatabaseInstance.fromDatabaseInstanceAttributes(this, 'ExistingDBInstance', {
      instanceIdentifier: dbInstanceIdentifier,
      instanceEndpointAddress: 'existing-db-instance-endpoint',
      port: 3306,
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
      vpc: dbInstance.vpc,
      secrets: [dbSecret],
      dbProxyName: 'my-proxy',
      role: proxyRole,
      vpcSubnets: {
        subnetType: cdk.SubnetType.PRIVATE,
      },
      engineFamily: rds.DatabaseProxyEngine.MYSQL,
      requireTLS: false,
      idleClientTimeout: cdk.Duration.minutes(30),
      debugLogging: false,
    });

    // Associate the proxy with the existing RDS DB instance
    proxy.addTarget(dbInstance);
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
