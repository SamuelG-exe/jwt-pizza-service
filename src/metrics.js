const config = require('./config'); 

const os = require('os');

class Metrics {
  
  constructor() {
    this.timer = null;
    this.totalRequests = 0;
    this.httpMethods = {
      GET: 0,
      POST: 0,
      DELETE: 0,
      PUT: 0,
    };
    this.pizzaSales = {
      sales: 0,
      revenue: 0,
      numFails: 0,
      createLatency: []
    };
    this.authMetrics = {
      sucsessful: 0,
      failed: 0
    };
    this.currentUsers = 0;
    this.httpLatency ={     
      generalLatency: []
    };



    // This will periodically sent metrics to Grafana
    this.sendMetricsPeriodically(10000);
  }


  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }
  
  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }

 sendMetricsPeriodically(period) {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      try {

        // HTTP Methods metrics
        this.sendMetricToGrafana('httpMethods', 'total_requests', this.getTotalRequests());
        this.sendMetricToGrafana('httpMethods', 'GET_requests', this.httpMethods.GET);
        this.sendMetricToGrafana('httpMethods', 'POST_requests', this.httpMethods.POST);
        this.sendMetricToGrafana('httpMethods', 'DELETE_requests', this.httpMethods.DELETE);
        this.sendMetricToGrafana('httpMethods', 'PUT_requests', this.httpMethods.PUT);
        this.sendMetricToGrafana('httpMethods', 'general_latency_ms', this.getAverageLatency('general'));

        // Pizza sales metrics
        this.sendMetricToGrafana('pizzaSales', 'total_sales', this.pizzaSales.sales);
        this.sendMetricToGrafana('pizzaSales', 'total_revenue', this.pizzaSales.revenue);
        this.sendMetricToGrafana('pizzaSales', 'total_failures', this.pizzaSales.numFails);
        this.sendMetricToGrafana('pizzaSales', 'pizza_latency_ms', this.getAverageLatency('pizza'));

        // Authentication metrics
        this.sendMetricToGrafana('auth', 'successful_auth', this.authMetrics.sucsessful);
        this.sendMetricToGrafana('auth', 'failed_auth', this.authMetrics.failed);

        // User metrics
        this.sendMetricToGrafana('users', 'active_count', this.currentUsers);

        // System metrics
        this.sendMetricToGrafana('system', 'memory_usage', this.getMemoryUsagePercentage());
        this.sendMetricToGrafana('system', 'cpu_load', this.getCpuUsagePercentage());
        } catch (error) {
          console.log('Error sending metrics', error);
      }
    }, period);
      this.timer.unref();
  }
  

  sendMetricToGrafana(metricPrefix, metricName, metricValue) {
    const metric = `${metricPrefix},source=${config.metrics.source} ${metricName}=${metricValue}`;

    fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metric,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to push metrics data to Grafana:', errorText);
        } else {
          console.log(`Pushed ${metric}`);
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
  }

//Helper Function to call in other files 

// HTTP Request Trackers
requestTracker(req, res, next) {
  res.on('finish', () => {
    // Increment the specific HTTP method count only if it exists in the map
    if (Object.prototype.hasOwnProperty.call(this.httpMethods, req.method)) {
      this.httpMethods[req.method]++;
    }
  });

  next();
}
trackRequestLatency(req, res, next) {
  const startTime = Date.now();
  res.on('finish', () => {
    this.trackGeneralLatency(startTime);
  });
  next();
}
getTotalRequests() {
  return Object.values(this.httpMethods).reduce((sum, count) => sum + count, 0);
}


// Pizza Sales Trackers
trackPizzaSale(revenue){
  this.pizzaSales.sales++;
  this.pizzaSales.revenue += revenue;
}

trackPizzaFailure(){
  this.pizzaSales.numFails++;
}

trackPizzaLatency(startTime){
  const latency = Date.now() - startTime;
  this.pizzaSales.createLatency.push(latency);
  
  // Keep only last 100 latency measurements
  if (this.pizzaSales.createLatency.length > 100) {
    this.pizzaSales.createLatency.shift();
  }
}
trackGeneralLatency(startTime) {
  const latency = Date.now() - startTime;
  this.httpLatency.generalLatency.push(latency);

  // Keep only the last 100 latency measurements
  if (this.httpLatency.generalLatency.length > 100) {
    this.httpLatency.generalLatency.shift();
  }
}


// Authentication Trackers
trackAuthSuccess(){
  this.authMetrics.sucsessful++;
}

trackAuthFailure(){
  this.authMetrics.failed++;
}

// User Trackers
trackUserLogin(){
  this.currentUsers++;
}

trackUserLogout(){
  this.currentUsers = Math.max(0, this.currentUsers - 1);
}

// Helper to get average latency
getAverageLatency(type){
  const latencyArray = type === 'pizza' 
    ? this.pizzaSales.createLatency 
    : this.httpLatency.generalLatency;

  if (latencyArray.length === 0) return 0;
  const sum = latencyArray.reduce((a, b) => a + b, 0);
  return sum / latencyArray.length;
}

resetMetrics() {
  // Reset HTTP Methods metrics
  this.totalRequests = 0;
  this.httpMethods = {
    GET: 0,
    POST: 0,
    DELETE: 0,
    PUT: 0,
  };

  // Reset pizza sales metrics
  this.pizzaSales = {
    sales: 0,
    revenue: 0,
    numFails: 0,
    createLatency: [],
  };

  // Reset authentication metrics
  this.authMetrics = {
    sucsessful: 0,
    failed: 0,
  };

  // Reset user metrics
  this.currentUsers = 0;

  // Reset latency metrics
  this.httpLatency = {
    generalLatency: [],
  };

  console.log("Metrics have been reset.");
}

}


const metrics = new Metrics();
module.exports = metrics;
