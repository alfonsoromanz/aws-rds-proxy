#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RdsProxyStack } from '../lib/cdk-stack';

const app = new cdk.App();
new RdsProxyStack(app, 'RdsProxyStack', {
  env: { account: process.env.AWS_ACCOUNT_ID, region: 'us-east-1' }
});
