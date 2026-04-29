using System;

//Params is used as a parameter which can take the VARIABLE NUMBER OF ARGUMENTS.  

//It is useful when programmer don’t have any prior knowledge about the number of parameters to be passed.
namespace What_is_the_purpose_of_params_keyword
{
    class Program
    {
        static void Main(string[] args)
        {            
            int sum = Add(5, 10, 15, 20, 30, 40);

            Console.WriteLine(sum);
            Console.ReadLine();
        }
       
        public static int Add(params int[] numbers)
        {
            int total = 0;
           
            foreach (int i in numbers)
            {
                total += i;
            }
            return total;            
        }

        //Output: 120

    }
}
