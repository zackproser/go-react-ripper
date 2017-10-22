FROM ubuntu

LABEL maintainer="zackproser@gmail.com"

RUN apt-get update

RUN apt-get install -y ca-certificates

WORKDIR /app

COPY go-react-ripper go-react-ripper

COPY ui/build ui/build

COPY ripCount ripCount

CMD ["./go-react-ripper"]