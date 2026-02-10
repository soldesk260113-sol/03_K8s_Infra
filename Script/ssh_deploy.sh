#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# SSH Key Deployment & Configuration Utility
# ═══════════════════════════════════════════════════════════════════════════
# Usage:
#   ./ssh_deploy.sh <mode> [target]
#
# Modes:
#   single <IP>           - Deploy host SSH key to single server
#   db-fix                - Deploy host SSH key to DB servers (via ProxyJump)
#   db-sudo               - Configure passwordless sudo on DB servers
#   jenkins-to-db         - Deploy Jenkins container key to DB servers
#   all-db                - Run all DB fixes (keys + sudo + jenkins)
# ═══════════════════════════════════════════════════════════════════════════

# set -e

PASSWORD="${SSH_PASSWORD:-centos}"
PROXY_HOST="10.2.2.20"

# ═══════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════

deploy_key_to_single() {
    local IP=$1
    local PUB_KEY=$(cat ~/.ssh/id_rsa.pub)
    local SSH_OPTS=("-o" "StrictHostKeyChecking=no" "-o" "UserKnownHostsFile=/dev/null" "-o" "ConnectTimeout=10")
    
    echo "📦 Deploying SSH key to $IP..."
    
    # Deploy to root
    sshpass -p "$PASSWORD" ssh "${SSH_OPTS[@]}" root@$IP \
        "mkdir -p ~/.ssh && chmod 700 ~/.ssh && grep -qF \"$PUB_KEY\" ~/.ssh/authorized_keys 2>/dev/null || echo \"$PUB_KEY\" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && restorecon -R -v ~/.ssh 2>/dev/null || true"
    [ $? -eq 0 ] && echo "  ✅ Root: OK" || echo "  ❌ Root: FAIL"
    
    # Deploy to ansible user (via Root to bypass password issue)
    sshpass -p "$PASSWORD" ssh "${SSH_OPTS[@]}" root@$IP \
        "mkdir -p /home/ansible/.ssh && echo \"$PUB_KEY\" >> /home/ansible/.ssh/authorized_keys && chown -R ansible:ansible /home/ansible/.ssh && chmod 700 /home/ansible/.ssh && chmod 600 /home/ansible/.ssh/authorized_keys && restorecon -R -v /home/ansible/.ssh 2>/dev/null || true"
    [ $? -eq 0 ] && echo "  ✅ Ansible: OK" || echo "  ❌ Ansible: FAIL"
}

deploy_key_to_db_via_proxy() {
    local PUB_KEY=$(cat ~/.ssh/id_rsa.pub)
    local PROXY_CMD="ssh -o StrictHostKeyChecking=no -W %h:%p -q root@$PROXY_HOST"
    
    echo "📦 Deploying SSH key to DB servers (via ProxyJump)..."
    
    for IP in "${DB_SERVERS[@]}"; do
        echo "  → $IP"
        sshpass -p "$PASSWORD" ssh -o ProxyCommand="$PROXY_CMD" -o StrictHostKeyChecking=no root@$IP \
            "mkdir -p /home/ansible/.ssh && echo \"$PUB_KEY\" >> /home/ansible/.ssh/authorized_keys && chown -R ansible:ansible /home/ansible/.ssh && chmod 700 /home/ansible/.ssh && chmod 600 /home/ansible/.ssh/authorized_keys && restorecon -R -v /home/ansible/.ssh 2>/dev/null || true"
        [ $? -eq 0 ] && echo "    ✅ SUCCESS" || echo "    ❌ FAIL"
    done
}

configure_db_sudo() {
    local PROXY_CMD="ssh -o StrictHostKeyChecking=no -W %h:%p -q root@$PROXY_HOST"
    
    echo "🔧 Configuring passwordless sudo on DB servers..."
    
    for IP in "${DB_SERVERS[@]}"; do
        echo "  → $IP"
        sshpass -p "$PASSWORD" ssh -o ProxyCommand="$PROXY_CMD" -o StrictHostKeyChecking=no root@$IP \
            "echo 'ansible ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/ansible && chmod 440 /etc/sudoers.d/ansible"
        [ $? -eq 0 ] && echo "    ✅ SUCCESS" || echo "    ❌ FAIL"
    done
}

configure_pc5_sudo() {
    local PC5_SERVERS=("10.2.2.40" "10.2.2.50" "10.2.2.51" "10.2.2.60")
    
    echo "🔧 Configuring passwordless sudo on PC5 servers (Ops/Mon/DNS)..."
    
    for IP in "${PC5_SERVERS[@]}"; do
        echo "  → $IP"
        sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no root@$IP \
            "echo 'ansible ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/ansible && chmod 440 /etc/sudoers.d/ansible"
        [ $? -eq 0 ] && echo "    ✅ SUCCESS" || echo "    ❌ FAIL"
    done
}

configure_pc4_sudo() {
    local PC4_SERVERS=("10.2.2.20" "10.2.2.21" "10.2.2.30")
    
    echo "🔧 Configuring passwordless sudo on PC4 servers (DB Proxy/Storage)..."
    
    for IP in "${PC4_SERVERS[@]}"; do
        echo "  → $IP"
        sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no root@$IP \
            "echo 'ansible ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/ansible && chmod 440 /etc/sudoers.d/ansible"
        [ $? -eq 0 ] && echo "    ✅ SUCCESS" || echo "    ❌ FAIL"
    done
}

configure_pc1_sudo() {
    local PC1_SERVERS=("172.16.6.61" "10.2.1.2")
    
    echo "🔧 Configuring passwordless sudo on PC1 servers (Gateway/WAF)..."
    
    for IP in "${PC1_SERVERS[@]}"; do
        echo "  → $IP"
        sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no root@$IP \
            "echo 'ansible ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/ansible && chmod 440 /etc/sudoers.d/ansible"
        [ $? -eq 0 ] && echo "    ✅ SUCCESS" || echo "    ❌ FAIL"
    done
}

configure_k8s_cp_sudo() {
    local K8S_CP_SERVERS=("10.2.2.2" "10.2.2.3" "10.2.2.4")
    
    echo "🔧 Configuring passwordless sudo on PC2 servers (K8S Control Plane)..."
    
    for IP in "${K8S_CP_SERVERS[@]}"; do
        echo "  → $IP"
        sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no root@$IP \
            "echo 'ansible ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/ansible && chmod 440 /etc/sudoers.d/ansible"
        [ $? -eq 0 ] && echo "    ✅ SUCCESS" || echo "    ❌ FAIL"
    done
}

configure_k8s_worker_sudo() {
    local K8S_WORKER_SERVERS=("10.2.2.5" "10.2.2.6" "10.2.2.7" "10.2.2.8" "10.2.2.9" "10.2.2.10")
    
    echo "🔧 Configuring passwordless sudo on PC3/PC6 servers (K8S Workers)..."
    
    for IP in "${K8S_WORKER_SERVERS[@]}"; do
        echo "  → $IP"
        sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no root@$IP \
            "echo 'ansible ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/ansible && chmod 440 /etc/sudoers.d/ansible"
        [ $? -eq 0 ] && echo "    ✅ SUCCESS" || echo "    ❌ FAIL"
    done
}

deploy_jenkins_key_to_db() {
    if ! docker ps | grep -q jenkins; then
        echo "❌ Jenkins container not running!"
        exit 1
    fi
    
    local JENKINS_KEY=$(docker exec jenkins cat /root/.ssh/id_rsa.pub 2>/dev/null)
    if [ -z "$JENKINS_KEY" ]; then
        echo "❌ Failed to get Jenkins SSH key!"
        exit 1
    fi
    
    local PROXY_CMD="ssh -o StrictHostKeyChecking=no -W %h:%p -q root@$PROXY_HOST"
    
    echo "🐳 Deploying Jenkins container SSH key to DB servers..."
    echo "Jenkins Key: ${JENKINS_KEY:0:50}..."
    echo ""
    
    for IP in "${DB_SERVERS[@]}"; do
        echo "  → $IP"
        sshpass -p "$PASSWORD" ssh -o ProxyCommand="$PROXY_CMD" -o StrictHostKeyChecking=no root@$IP \
            "grep -qF \"$JENKINS_KEY\" /home/ansible/.ssh/authorized_keys 2>/dev/null || echo \"$JENKINS_KEY\" >> /home/ansible/.ssh/authorized_keys && chmod 600 /home/ansible/.ssh/authorized_keys && chown ansible:ansible /home/ansible/.ssh/authorized_keys"
        [ $? -eq 0 ] && echo "    ✅ SUCCESS" || echo "    ❌ FAIL"
    done
    
    echo ""
    echo "🔍 Verification: Testing Jenkins container SSH access..."
    for IP in "${DB_SERVERS[@]}"; do
        docker exec jenkins ssh -o ProxyCommand='ssh -W %h:%p -q root@10.2.2.20' -o StrictHostKeyChecking=no ansible@$IP 'echo "  ✅ '$IP': OK"' 2>/dev/null || echo "  ❌ $IP: FAIL"
    done
}

# ═══════════════════════════════════════════════════════════════════════════
# Main Logic
# ═══════════════════════════════════════════════════════════════════════════

MODE=${1:-}
TARGET=${2:-}

case "$MODE" in
    single)
        if [ -z "$TARGET" ]; then
            echo "Usage: $0 single <IP>"
            exit 1
        fi
        deploy_key_to_single "$TARGET"
        ;;
    
    db-fix)
        deploy_key_to_db_via_proxy
        ;;
    
    db-sudo)
        configure_db_sudo
        ;;

    pc4-sudo)
        configure_pc4_sudo
        ;;

    pc5-sudo)
        configure_pc5_sudo
        ;;
    
    jenkins-to-db)
        deploy_jenkins_key_to_db
        ;;
    
    all-db)
        echo "═══════════════════════════════════════════════════════════════"
        echo "Running ALL DB server fixes..."
        echo "═══════════════════════════════════════════════════════════════"
        deploy_key_to_db_via_proxy
        echo ""
        configure_db_sudo
        echo ""
        deploy_jenkins_key_to_db
        echo ""
        echo "✅ All DB fixes completed!"
        ;;

    all)
        echo "═══════════════════════════════════════════════════════════════"
        echo "Running ALL System Fixes (DB + PC1/2/3/4/5/6)..."
        echo "═══════════════════════════════════════════════════════════════"
        
        # 1. DB Servers SSH Keys (via Proxy)
        deploy_key_to_db_via_proxy
        echo ""
        
        # 2. Sudo Configuration (DB, PC4, PC5, PC1, K8S)
        configure_db_sudo
        configure_pc4_sudo
        configure_pc5_sudo
        configure_pc1_sudo
        configure_k8s_cp_sudo
        configure_k8s_worker_sudo
        echo ""
        
        # 3. Jenkins Keys to DB
        deploy_jenkins_key_to_db
        echo ""
        
        echo "✅ All system fixes completed!"
        ;;
    
    *)
        echo "Usage: $0 <mode> [target]"
        echo ""
        echo "Modes:"
        echo "  single <IP>      - Deploy host SSH key to single server"
        echo "  db-fix           - Deploy host SSH key to DB servers (via ProxyJump)"
        echo "  db-sudo          - Configure passwordless sudo on DB servers"
        echo "  pc4-sudo         - Configure passwordless sudo on PC4 servers (DBProxy/Storage)"
        echo "  pc5-sudo         - Configure passwordless sudo on PC5 servers (Ops/Mon/DNS)"
        echo "  jenkins-to-db    - Deploy Jenkins container key to DB servers"
        echo "  all-db           - Run all DB fixes (keys + sudo + jenkins)"
        echo "  all              - Run ALL setup steps (DB keys, all sudo configs, Jenkins keys)"
        exit 1
        ;;
esac
