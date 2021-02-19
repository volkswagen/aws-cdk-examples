import ecs = require('@aws-cdk/aws-ecs');
import ec2 = require('@aws-cdk/aws-ec2');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import { Stack, Construct, StackProps, CfnOutput } from '@aws-cdk/core';


//---------------------------------------------------------------------------
//  Load balancer stack

export interface SharedListenerWithFixedResponseProps extends StackProps {
  vpc: ec2.IVpc;
}

export class SharedListener_LoadBalancerStack extends Stack {
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly listener: elbv2.ApplicationListener;

  constructor(scope: Construct, id: string, props: SharedListenerWithFixedResponseProps) {
    super(scope, id, props);

    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc: props.vpc,
      internetFacing: true
    });

    this.listener = this.loadBalancer.addListener("Listener", {
      open: true,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.fixedResponse(200, {
        messageBody: 'Hi! Fixed response from LB',
        contentType: 'text/plain'
      })
    })

    new CfnOutput(this, 'LoadBalancerDNS', { value: this.loadBalancer.loadBalancerDnsName, });
  }
}

//---------------------------------------------------------------------------
//  Service stack

export interface SharedListener_ServiceStackProps extends StackProps {
  vpc: ec2.IVpc;
  cluster: ecs.ICluster;
  listener: elbv2.IApplicationListener;
  querystring: string;
  lbRulePriority: number;
}

export class SharedListener_ServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: SharedListener_ServiceStackProps) {
    super(scope, id, props);

    // Standard ECS service setup
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef');
    const container = taskDefinition.addContainer('web', {
      image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      memoryLimitMiB: 256,
    });

    container.addPortMappings({
      containerPort: 80,
      protocol: ecs.Protocol.TCP
    });

    const service = new ecs.FargateService(this, "Service", {
      cluster: props.cluster,
      taskDefinition,
    });

    // Using eg. .addTarget would create these resources in the SharedListener_LoadBalancerStack.
    // see https://github.com/aws/aws-cdk/issues/4408
    const containerLBTarget = service.loadBalancerTarget({
      containerName: container.containerName
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      targets: [ containerLBTarget ],
      vpc: props.vpc,
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    new elbv2.ApplicationListenerRule(this, 'LBRule', {
      priority: props.lbRulePriority,
      listener: props.listener,
      conditions: [
        elbv2.ListenerCondition.queryStrings([
          {
            key: 'app',
            value: props.querystring
          }
        ])
      ],
      targetGroups: [ targetGroup ],
    });
  }
}