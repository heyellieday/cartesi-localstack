FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:0-14

# Install AWS CLI and Pulumi
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    curl -fsSL https://get.pulumi.com | sh

# Install Docker CLI
RUN apt-get update && \
    apt-get install -y apt-transport-https docker-ce docker-ce-cli containerd.io

# Set up your environment
WORKDIR /workspace
