import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const localProvide = new aws.Provider("localProvide", {
    accessKey: "test",
    secretKey: "testsecret",
    region: "us-east-1",
    skipCredentialsValidation: true,
    skipMetadataApiCheck: true,
    skipRegionValidation: true,
    skipRequestingAccountId: true,
    s3UsePathStyle: true,
    endpoints: [
        {
            s3: "http://localhost:4566",
            ecs: "http://localhost:4566",
            ec2: "http://localhost:4566",
            iam: "http://localhost:4566"
        }
    ],
})
// S3 bucket
const ipfsBucket = new aws.s3.Bucket("ipfsBucket", {
    bucketPrefix: "ipfs-data-"
}, { provider: localProvide });

// ECS cluster
const cluster = new aws.ecs.Cluster("cluster", {}, { provider: localProvide });

// IAM role
const taskExecRole = new aws.iam.Role("taskExecRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs-tasks.amazonaws.com" }),
}, { provider: localProvide });

new aws.iam.RolePolicyAttachment("taskExecPolicyAttachment", {
    role: taskExecRole,
    policyArn: aws.iam.ManagedPolicy.AmazonEC2ContainerServiceforEC2Role,
}, { provider: localProvide });

// Kubo/IPFS task definition with S3 as datastore
const ipfsTask = new aws.ecs.TaskDefinition("ipfsTask", {
    family: "ipfs",
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: taskExecRole.arn,
    containerDefinitions: pulumi.interpolate`[
        {
            "name": "ipfs",
            "image": "ipfs/go-ipfs:latest",
            "essential": true,
            "environment": [
                { "name": "IPFS_S3_BUCKET", "value": "${ipfsBucket.id}" }
            ],
            "portMappings": [
                { "containerPort": 5001, "hostPort": 5001 }
            ]
        }
    ]`,
}, { provider: localProvide });

// ECS Service for IPFS
const ipfsService = new aws.ecs.Service("ipfsService", {
    cluster: cluster.arn,
    desiredCount: 1,
    launchType: "FARGATE",
    taskDefinition: ipfsTask.arn,
    networkConfiguration: {
        subnets: ["subnet-xxxx"],
        securityGroups: ["sg-xxxx"],
        assignPublicIp: true,
    },
}, { provider: localProvide });

// Lambada task definition
const lambadaTask = new aws.ecs.TaskDefinition("lambadaTask", {
    family: "lambada",
    cpu: "512",
    memory: "1024",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: taskExecRole.arn,
    containerDefinitions: pulumi.interpolate`[
        {
            "name": "lambada",
            "image": "zippiehq/cartesi-lambada:latest",
            "essential": true,
            "portMappings": [
                { "containerPort": 3033, "hostPort": 80 }
            ],
            "environment": [
                { "name": "IPFS_API_URL", "value": "http://${ipfsService.cluster}.${aws.config.region}.amazonaws.com:5001" }
            ]
        }
    ]`,
}, { provider: localProvide });

// ECS Service for Lambada
const lambadaService = new aws.ecs.Service("lambadaService", {
    cluster: cluster.arn,
    desiredCount: 1,
    launchType: "FARGATE",
    taskDefinition: lambadaTask.arn,
    networkConfiguration: {
        subnets: ["subnet-xxxx"],
        securityGroups: ["sg-xxxx"],
        assignPublicIp: true,
    },
}, { provider: localProvide });

// service URLs
export const ipfsServiceUrl = pulumi.interpolate`http://${ipfsService.cluster}.${aws.config.region}.amazonaws.com:5001`;
export const lambadaServiceUrl = pulumi.interpolate`http://${lambadaService.cluster}.${aws.config.region}.amazonaws.com:80`;
