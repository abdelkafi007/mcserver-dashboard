#!/bin/bash
cat << 'EOF' > /tmp/minecraft.service
[Unit]
Description=Minecraft Server
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/minecraft
ExecStart=/usr/bin/screen -DmS forge /bin/sh ./run.sh
ExecStop=/usr/bin/screen -p 0 -S forge -X eval 'stuff "stop"\015'
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo cp /tmp/minecraft.service /etc/systemd/system/minecraft.service
sudo systemctl daemon-reload
sudo systemctl enable minecraft
sudo systemctl start minecraft
