using System;

namespace Can_we_execute_multiple_Catch_blocks
{
    class Program
    {
        static void Main(string[] args)
        {           
            try
            {
                int i = 0;
                int j = 0;

                int k = i / j;
            }               
            catch (ArithmeticException ex)
            {
                Console.WriteLine(ex.Message);
            }
            catch (ArgumentOutOfRangeException ex)
            {
                Console.WriteLine(ex.Message);
            }           
        }
    }
}
//Why we need multiple catch blocks?