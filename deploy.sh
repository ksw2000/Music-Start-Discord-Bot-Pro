#!/bin/bash
string=`ps -ef | grep "src/main.ts" | grep -v "grep" | tr -s " " | cut -d " " -f 2`
array=(${string//,/ })

for var in ${array[@]}
do
   kill -9 $var
done

nohup npm start &
