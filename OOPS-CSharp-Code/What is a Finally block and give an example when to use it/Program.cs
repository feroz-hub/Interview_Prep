using System;
using System.Data.SqlClient;

//Finally block will be executed IRRESPECTIVE of exception.
namespace What_is_a_Finally_block_and_give_an_example_when_to_use_it
{
    class Program
    {

        static void Main(string[] args)
        {
            SqlConnection con = new SqlConnection("conString");
            try
            {                
                con.Open();
                
                //Some logic

                // Error occurred
               
                //con.Close();
            }
            catch(Exception ex)
            {
                // error handled 
            }
            finally
            {
                // Connection closed  
                con.Close();
            }
        }

    }
}
