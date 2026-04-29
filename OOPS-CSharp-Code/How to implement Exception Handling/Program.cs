using System;

//Exception handling in Object-Oriented Programming is used to MANAGE ERRORS. 
namespace How_to_implement_Exception_Handling
{
    class Program
    {
        static void Main(string[] args)
        {
            
            try
            {
                int i = 1;
                int j = 1;

                int k = i / j;
            }           
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);

                throw;
            }            
            finally
            {
                Console.WriteLine("Finally");
                Console.ReadLine();
            }
        }
    }
}
