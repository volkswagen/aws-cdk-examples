This example shows how to use a load balancer in a different
stack to load balance to an ECS service.

You must either create an `ApplicationListener` in the same stack as your
ECS service, or create an empty `TargetGroup` in your load balancer stack
and register your ECS service into that.

This example demos both of these possibilities. It uses Fargate,
but the same principles hold for EC2 services.

Option 1: Split at listener
---------------------------

Shown in `split-at-listener.ts`, create an `ApplicationLoadBalancer`
in a shared stack, and an `ApplicationListener` in the service stack.


Option 2: Split at target group
-------------------------------

Shown in `split-at-targetgroup.ts`, create an empty `TargetGroup` in the load
balancer stack, and register a `Service` into it in the service stack.


Option 3: Shared listener with fixed response
---------------------------------------------

Shown in `shared-listener-with-fixed-response.ts`, create the shared listener
with a fixed response and add a new listener rule per service stack.
A shared listener can route to different ecs Service on the same URL:Port.
The load balancer responds with a fixed response as fallback.
To call the application append `/?app=app1` to the LoadBalancer URL.
