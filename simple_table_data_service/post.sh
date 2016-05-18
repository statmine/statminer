#!/bin/bash

curl -ip -H "Content-Type: application/json" -X POST -d $1 http://localhost:8088/table/diabetes/query

