using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Assembly_2
{
    public class Employee
    {
        public int GetSalary()
        {
            string conString = "test";

            using (SqlConnection connection = new SqlConnection(conString))
            {
                // use the connection here
                connection.Open();

                // execute a query, etc.

            } // the connection is automatically closed here

            return 1000000;
        }


    }
}
