# Welcome to your CDK TypeScript project!

Make sure to have AWS CLI and CDK CLI installed

Make sure you copy the .env.example file into .env file and provide proper credentials

Make sure to bootstrap your account for CDK: `cdk bootstrap aws://${ACCOUNT_ID}/${REGION}`

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
