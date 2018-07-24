
docker container prune -f

# docker run python classifier.js
# docker run -v $(pwd)/assets:/workspace -p 3005:80 -e S3_BUCKET=$ZEOCHAT_S3_BUCKET_ASSETS -e AWS_ACCESS_KEY_ID=$ZEOCHAT_S3_ACCESS -e AWS_SECRET_ACCESS_KEY=$ZEOCHAT_S3_SECRET bvlc/caffe:cpu bash run-app.sh

# docker run bash
# docker run -v $(pwd)/assets:/workspace -p 3005:80 -e S3_BUCKET=$ZEOCHAT_S3_BUCKET_ASSETS -e AWS_ACCESS_KEY_ID=$ZEOCHAT_S3_ACCESS -e AWS_SECRET_ACCESS_KEY=$ZEOCHAT_S3_SECRET -it bvlc/caffe:cpu bash

# docker run dangarfield:safe-search
docker run -p $ZEOCHAT_PORT_CLASSIFIER:80 -e S3_BUCKET=$ZEOCHAT_S3_BUCKET_ASSETS -e AWS_ACCESS_KEY_ID=$ZEOCHAT_S3_ACCESS -e AWS_SECRET_ACCESS_KEY=$ZEOCHAT_S3_SECRET dangarfield:safe-search

# docker run dangarfield:safe-search bash
# docker run -p $ZEOCHAT_PORT_CLASSIFIER:80 -e S3_BUCKET=$ZEOCHAT_S3_BUCKET_ASSETS -e AWS_ACCESS_KEY_ID=$ZEOCHAT_S3_ACCESS -e AWS_SECRET_ACCESS_KEY=$ZEOCHAT_S3_SECRET -it dangarfield:safe-search bash

# to build docker image
# based on bvlc/caffe
# pip install boto3