import ecs = require('@aws-cdk/aws-ecs');
import ec2 = require('@aws-cdk/aws-ec2');
import { Stack, Construct, StackProps, App } from '@aws-cdk/core';
import { SplitAtListener_LoadBalancerStack, SplitAtListener_ServiceStack } from './split-at-listener';
import { SplitAtTargetGroup_LoadBalancerStack, SplitAtTargetGroup_ServiceStack } from './split-at-targetgroup';
import { SharedListener_LoadBalancerStack, SharedListener_ServiceStack } from "./shared-listener-with-fixed-response";

/**
 * Shared infrastructure -- VPC and Cluster
 */
class SharedInfraStack extends Stack {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: this.vpc
    });
  }
}

const app = new App();

const infra = new SharedInfraStack(app, 'CrossStackLBInfra');

// Demo that splits at Listener
const splitAtListenerLBStack = new SplitAtListener_LoadBalancerStack(app, 'SplitAtListener-LBStack', {
  vpc: infra.vpc,
});
new SplitAtListener_ServiceStack(app, 'SplitAtListener-ServiceStack', {
  cluster: infra.cluster,
  vpc: infra.vpc,
  loadBalancer: splitAtListenerLBStack.loadBalancer
});

// Demo that splits at Target Group
const splitAtTargetGroupLBStack = new SplitAtTargetGroup_LoadBalancerStack(app, 'SplitAtTargetGroup-LBStack', {
  vpc: infra.vpc,
});
new SplitAtTargetGroup_ServiceStack(app, 'SplitAtTargetGroup-ServiceStack', {
  cluster: infra.cluster,
  vpc: infra.vpc,
  targetGroup: splitAtTargetGroupLBStack.targetGroup
});

// Demo shared Loadbalancer with fixed response
const sharedListenerLoadBalancerStack = new SharedListener_LoadBalancerStack(app, 'SharedListener-LoadBalancerStack', {
  vpc: infra.vpc
});

new SharedListener_ServiceStack(app, 'SharedListener-ServiceStack1',{
  vpc: infra.vpc,
  cluster: infra.cluster,
  listener: sharedListenerLoadBalancerStack.listener,
  querystring: 'app1',
  lbRulePriority: 1,
})

new SharedListener_ServiceStack(app, 'SharedListener-ServiceStack2',{
  vpc: infra.vpc,
  cluster: infra.cluster,
  listener: sharedListenerLoadBalancerStack.listener,
  querystring: 'app2',
  lbRulePriority: 2,
})

app.synth();