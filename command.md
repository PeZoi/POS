docker build -t docker.io/pezoi/pos-backend:latest ./be
docker build -t docker.io/pezoi/pos-scanner:latest ./scanner-py
docker build -t docker.io/pezoi/pos-nginx:latest -f nginx/Dockerfile .

docker push docker.io/pezoi/pos-backend:latest
docker push docker.io/pezoi/pos-scanner:latest
docker push docker.io/pezoi/pos-nginx:latest