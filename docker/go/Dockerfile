FROM golang:1.23.7-bullseye

RUN apt update
RUN apt -y install default-mysql-client

WORKDIR /app
# goose v3.27.0 requires Go >=1.25, so we pin to v3.10.0 (aligned with CI)
RUN go install github.com/pressly/goose/v3/cmd/goose@v3.10.0
RUN go install github.com/k1LoW/tbls@v1.77.0

COPY test-ix-prepare .
COPY test-ix-healthcheck .

CMD [ "sleep", "Infinity" ]
